# PayMongo setup (card + GCash)

Card and GCash are charged through **PayMongo hosted checkout**. The customer
pays on PayMongo's own page, so no card number ever reaches this application.

Until `PAYMONGO_SECRET_KEY` is set, card and GCash are **not offered at all** —
cash keeps working, and the storefront falls back to the manual GCash
reference-number flow if a GCash number is configured in Settings.

---

## 1. Get your keys

1. Sign in at <https://dashboard.paymongo.com>
2. **Developers → API Keys**
3. Copy the **test** keys first (`sk_test_...`, `pk_test_...`)

Put them in `japz-backend/.env`:

```
PAYMONGO_SECRET_KEY=sk_test_xxxxxxxxxxxx
PAYMONGO_PUBLIC_KEY=pk_test_xxxxxxxxxxxx
PAYMONGO_METHODS=card,gcash
```

> The secret key is a credential. Keep it in `.env` only — never in the
> frontend, never in git, never pasted into a chat window.

Restart the backend. Card and GCash now appear at checkout.

---

## 2. Run the migration

```bash
node migrations/add-paymongo-payments.js
```

This adds the `awaiting-payment` order status, the `payment_sessions` table, and
two columns on `payments`.

---

## 3. Register the webhook

The webhook is how a payment is confirmed when the customer closes the tab
instead of returning to the site. **PayMongo must be able to reach your server
over the public internet**, which a laptop on localhost is not.

### For a deployed server

```bash
curl https://api.paymongo.com/v1/webhooks \
  -u sk_test_xxxxxxxxxxxx: \
  -H "Content-Type: application/json" \
  -d '{"data":{"attributes":{"url":"https://YOUR-DOMAIN/api/payments/webhook","events":["checkout_session.payment.paid","payment.paid","payment.failed"]}}}'
```

The response contains a `secret_key` starting with `whsk_`. Put it in `.env`:

```
PAYMONGO_WEBHOOK_SECRET=whsk_xxxxxxxxxxxx
```

### For local development

Expose your machine first, then register that URL:

```bash
npx localtunnel --port 3000
```

Use the printed `https://…` address as the webhook URL.

---

## 4. Testing without a webhook

**Everything still works locally without a webhook.** When the customer returns
from PayMongo, the server asks PayMongo directly whether the session was paid
(`confirmedVia: "readback"` instead of `"webhook"`). The POS screen polls the
same way while the QR is on screen.

What you lose without a webhook: a customer who pays and immediately closes the
tab is not confirmed until someone opens the order again.

PayMongo publishes test card numbers in their docs — use those, never a real
card, while on test keys.

---

## 5. The minimum charge

PayMongo enforces a **per-account minimum charge** that is not published in
their API reference and is adjusted by their support team. Several menu items
here are under ₱100, so this matters.

`PAYMONGO_MIN_AMOUNT` (centavos, default `10000` = ₱100) is a pre-check so an
undersized order is refused with a clear message instead of failing at the
gateway. **Confirm your account's real floor with PayMongo and set it to
match**, or set `0` to remove the pre-check and let PayMongo reject undersized
charges itself.

---

## How a payment flows

```
Customer picks Card/GCash
  -> order created with status 'awaiting-payment'   (kitchen does NOT see it)
  -> stock reserved
  -> checkout session created, customer redirected to PayMongo
  -> customer pays on PayMongo's page
  -> confirmed by webhook, or by read-back when they return
  -> order status becomes 'pending'                 (kitchen sees it now)
  -> payment marked completed with the PayMongo payment id
```

If the payment fails or is cancelled, the reserved stock is put back and the
order is cancelled.

## Rules the code enforces

- An order is **never** marked paid by the browser. Only PayMongo's own answer
  settles it, read server-side.
- Webhook signatures are verified (HMAC-SHA256 over `timestamp.rawBody`), with
  test and live signatures kept separate and a 5-minute replay window.
- Settlement is idempotent: webhook retries and the return trip race safely.
- An unpaid order cannot reach the kitchen.
- A customer can only see or pay for their own orders.

## Going live

1. Complete PayMongo's account activation.
2. Swap in the live keys (`sk_live_...`).
3. Register a **new** webhook against your production URL and update
   `PAYMONGO_WEBHOOK_SECRET` — test and live webhooks are separate.
4. Set `APP_ORIGIN` to your public URL so the return links are correct.
