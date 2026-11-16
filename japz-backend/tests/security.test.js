import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { requireJwtSecret, readBootstrapAccount } from "../services/securityConfig.js";

test("signing keys must be explicitly configured and strong", () => {
  for (const secret of [undefined, "", "short", "a".repeat(48)]) {
    assert.throws(() => requireJwtSecret({ JWT_SECRET: secret }), /Set JWT_SECRET/);
  }
  const secret = crypto.randomBytes(48).toString("base64url");
  assert.equal(requireJwtSecret({ JWT_SECRET: secret }), secret);
});

test("placeholder signing keys are rejected even when they are long", () => {
  for (const prefix of ["your-", "change-me-", "xianfire-secret-"]) {
    assert.throws(
      () => requireJwtSecret({ JWT_SECRET: prefix + crypto.randomBytes(32).toString("hex") }),
      /Set JWT_SECRET/,
    );
  }
});

test("empty bootstrap configuration creates no default accounts", () => {
  for (const role of ["admin", "cashier", "kitchen"]) {
    assert.equal(readBootstrapAccount(role, {}), null);
  }
});

test("bootstrap credentials require a complete valid pair", () => {
  const password = crypto.randomBytes(18).toString("base64url");
  for (const environment of [
    { BOOTSTRAP_ADMIN_EMAIL: "admin@example.test" },
    { BOOTSTRAP_ADMIN_PASSWORD: password },
    { BOOTSTRAP_ADMIN_EMAIL: "invalid", BOOTSTRAP_ADMIN_PASSWORD: password },
    { BOOTSTRAP_ADMIN_EMAIL: "admin@example.test", BOOTSTRAP_ADMIN_PASSWORD: "short" },
  ]) {
    assert.throws(() => readBootstrapAccount("admin", environment), /Set BOOTSTRAP_ADMIN/);
  }
});

test("bootstrap passwords cannot exceed bcrypt's UTF-8 byte limit", () => {
  assert.throws(() => readBootstrapAccount("admin", {
    BOOTSTRAP_ADMIN_EMAIL: "admin@example.test",
    BOOTSTRAP_ADMIN_PASSWORD: "é".repeat(37),
  }), /12 to 72 UTF-8 bytes/);
});

test("configured bootstrap accounts preserve the intended role and normalized address", () => {
  const password = crypto.randomBytes(18).toString("base64url");
  const account = readBootstrapAccount("cashier", {
    BOOTSTRAP_CASHIER_EMAIL: " Cashier@Example.Test ",
    BOOTSTRAP_CASHIER_PASSWORD: password,
    BOOTSTRAP_CASHIER_NAME: " Cashier staff ",
  });
  assert.deepEqual(account, {
    name: "Cashier staff",
    email: "cashier@example.test",
    password,
    role: "cashier",
    status: "approved",
  });
  assert.throws(() => readBootstrapAccount("inventory", {}), /Unsupported bootstrap role/);
});
