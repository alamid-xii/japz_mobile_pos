import crypto from "crypto";

/**
 * PayMongo hosted checkout.
 *
 * Card details never touch this server: the customer is redirected to
 * PayMongo's own checkout page, so this application stays out of PCI scope.
 * Nothing here is charged or confirmed locally — a payment is only ever marked
 * paid from PayMongo's own answer (webhook, or a direct read-back of the
 * session). The browser's return trip is treated as a hint, never as proof.
 */

// Overridable only so the flow can be exercised against a local mock in tests.
// Leave unset everywhere else.
const API_BASE = process.env.PAYMONGO_API_BASE || "https://api.paymongo.com/v1";

const secretKey = () => process.env.PAYMONGO_SECRET_KEY || "";
const webhookSecret = () => process.env.PAYMONGO_WEBHOOK_SECRET || "";

/** Nothing is offered to customers unless a key is actually configured. */
export const isConfigured = () => secretKey().startsWith("sk_");

/** True while running against test keys, which selects the signature to check. */
export const isTestMode = () => secretKey().startsWith("sk_test");

/**
 * PayMongo enforces a per-account minimum charge, and it is NOT published in
 * the API reference — merchants have it adjusted by PayMongo support. It is
 * configurable here rather than guessed: set it to your account's real floor.
 * 0 disables the pre-check and lets PayMongo reject the charge itself.
 */
export const minimumCentavos = () => {
  const n = Number(process.env.PAYMONGO_MIN_AMOUNT);
  return Number.isFinite(n) && n >= 0 ? n : 10000;
};

/** Payment methods this integration offers, filtered to what is enabled. */
export const enabledMethods = () => {
  const raw = (process.env.PAYMONGO_METHODS || "card,gcash")
    .split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  const known = ["card", "gcash", "paymaya", "grab_pay", "billease", "dob", "atome"];
  return raw.filter(m => known.includes(m));
};

const authHeader = () =>
  "Basic " + Buffer.from(`${secretKey()}:`).toString("base64");

/** Pulls a usable message out of PayMongo's error envelope. */
const errorMessage = (body, fallback) => {
  const detail = body?.errors?.[0]?.detail;
  return typeof detail === "string" && detail.trim() ? detail : fallback;
};

const request = async (method, path, payload) => {
  if (!isConfigured()) throw new Error("Online payment is not configured.");

  const res = await fetch(API_BASE + path, {
    method,
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: payload ? JSON.stringify(payload) : undefined,
  });

  let body = null;
  try { body = await res.json(); } catch { body = null; }

  if (!res.ok) {
    const err = new Error(errorMessage(body, `PayMongo request failed (${res.status}).`));
    err.status = res.status;
    err.paymongo = body?.errors ?? null;
    throw err;
  }
  return body;
};

/** Pesos -> centavos, the only unit the API accepts. */
export const toCentavos = (peso) => Math.round(Number(peso) * 100);

/**
 * Creates a hosted checkout session.
 * `referenceNumber` is our own order number, which is what the webhook and the
 * read-back are matched against.
 */
export const createCheckoutSession = async ({
  lineItems,
  referenceNumber,
  description,
  successUrl,
  cancelUrl,
  methods,
  metadata = {},
  customerEmail,
}) => {
  const body = {
    data: {
      attributes: {
        line_items: lineItems.map(i => ({
          name: String(i.name).slice(0, 255),
          amount: toCentavos(i.amount),
          currency: "PHP",
          quantity: i.quantity,
        })),
        payment_method_types: methods?.length ? methods : enabledMethods(),
        reference_number: referenceNumber,
        description: String(description || `Order ${referenceNumber}`).slice(0, 255),
        // Metadata values must be strings.
        metadata: Object.fromEntries(
          Object.entries({ ...metadata, orderNumber: referenceNumber })
            .map(([k, v]) => [k, String(v)]),
        ),
        send_email_receipt: false,
        show_description: true,
        show_line_items: true,
        ...(successUrl ? { success_url: successUrl } : {}),
        ...(cancelUrl ? { cancel_url: cancelUrl } : {}),
        ...(customerEmail ? { customer_email: customerEmail } : {}),
      },
    },
  };

  const json = await request("POST", "/checkout_sessions", body);
  const a = json?.data?.attributes ?? {};
  return {
    id: json?.data?.id,
    checkoutUrl: a.checkout_url,
    status: a.status,
    raw: json,
  };
};

/**
 * Reads a session back from PayMongo. This is the authoritative check used
 * when the customer returns from checkout, since a redirect proves nothing.
 */
export const retrieveCheckoutSession = async (sessionId) => {
  const json = await request("GET", `/checkout_sessions/${encodeURIComponent(sessionId)}`);
  const a = json?.data?.attributes ?? {};

  // A session carries its payments once one succeeds. Anything other than a
  // 'paid' payment is treated as not paid.
  const payments = a.payments || a.payment_intent?.attributes?.payments || [];
  const paid = payments.find(p => p?.attributes?.status === "paid");

  return {
    id: json?.data?.id,
    sessionStatus: a.status,
    paid: !!paid,
    paymentId: paid?.id ?? null,
    paidAmount: paid?.attributes?.amount ?? null,
    method: paid?.attributes?.source?.type
      ?? a.payment_intent?.attributes?.payment_method_allowed?.[0]
      ?? null,
    referenceNumber: a.reference_number ?? null,
    raw: json,
  };
};

export const expireCheckoutSession = (sessionId) =>
  request("POST", `/checkout_sessions/${encodeURIComponent(sessionId)}/expire`);

/**
 * Verifies the `Paymongo-Signature` header.
 *
 * The header looks like `t=<unix>,te=<test sig>,li=<live sig>`. The signed
 * string is `<t>.<raw body>`, HMAC-SHA256 with the webhook secret. `te` is
 * checked against test keys and `li` against live keys, so a test-mode event
 * can never be accepted as a live one.
 *
 * `rawBody` MUST be the exact bytes received. A re-serialised object will not
 * match.
 */
export const verifyWebhookSignature = (rawBody, signatureHeader, { toleranceSeconds = 300 } = {}) => {
  const secret = webhookSecret();
  if (!secret) return { ok: false, reason: "no-secret" };
  if (!signatureHeader) return { ok: false, reason: "no-signature" };

  const parts = Object.fromEntries(
    String(signatureHeader).split(",").map(p => {
      const i = p.indexOf("=");
      return i === -1 ? [p.trim(), ""] : [p.slice(0, i).trim(), p.slice(i + 1).trim()];
    }),
  );

  const timestamp = parts.t;
  const provided = isTestMode() ? parts.te : parts.li;
  if (!timestamp || !provided) return { ok: false, reason: "malformed-signature" };

  // Rejects replays of an old, validly-signed event.
  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (!Number.isFinite(age) || age > toleranceSeconds) return { ok: false, reason: "stale" };

  const payload = `${timestamp}.${Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : String(rawBody)}`;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(provided, "utf8");
  if (a.length !== b.length) return { ok: false, reason: "mismatch" };
  if (!crypto.timingSafeEqual(a, b)) return { ok: false, reason: "mismatch" };

  return { ok: true };
};
