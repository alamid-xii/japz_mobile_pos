export function requireJwtSecret(environment = process.env) {
  const secret = environment.JWT_SECRET;
  if (
    typeof secret !== "string" ||
    Buffer.byteLength(secret, "utf8") < 32 ||
    /^(?:your[-_ ]|change[-_ ]?me|xianfire-secret)/i.test(secret) ||
    /(.)\1{15}/.test(secret)
  ) {
    throw new Error(
      "Set JWT_SECRET to a unique random value of at least 32 bytes in the private backend environment.",
    );
  }
  return secret;
}

export function readBootstrapAccount(role, environment = process.env) {
  if (!["admin", "cashier", "kitchen"].includes(role)) {
    throw new Error("Unsupported bootstrap role.");
  }
  const prefix = `BOOTSTRAP_${role.toUpperCase()}`;
  const email = environment[`${prefix}_EMAIL`]?.trim().toLowerCase();
  const password = environment[`${prefix}_PASSWORD`];
  if (!email && !password) return null;
  if (
    !email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254 ||
    typeof password !== "string" ||
    Buffer.byteLength(password, "utf8") < 12 ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    throw new Error(
      `Set ${prefix}_EMAIL and ${prefix}_PASSWORD together; use a valid email and a unique password of 12 to 72 UTF-8 bytes.`,
    );
  }
  const name = environment[`${prefix}_NAME`]?.trim() ||
    role[0].toUpperCase() + role.slice(1);
  if (name.length > 160) throw new Error(`${prefix}_NAME is too long.`);
  return { name, email, password, role, status: "approved" };
}
