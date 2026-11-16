import "dotenv/config";
import bcrypt from "bcrypt";
import { User } from "../models/userModel.js";
import { readBootstrapAccount } from "./securityConfig.js";

// Validate every configured account before writing. Existing accounts keep their
// passwords, roles and status; no accounts are created from public defaults.
export async function bootstrapAccounts(roles) {
  const accounts = roles.map((role) => readBootstrapAccount(role)).filter(Boolean);
  for (const account of accounts) {
    const existing = await User.findOne({ where: { email: account.email } });
    if (existing) {
      console.log(`${account.role} bootstrap account already exists.`);
      continue;
    }
    await User.create({
      ...account,
      password: await bcrypt.hash(account.password, 12),
    });
    console.log(`${account.role} bootstrap account created.`);
  }
}
