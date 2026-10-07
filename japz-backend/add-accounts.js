import { sequelize } from "./models/db.js";
import { bootstrapAccounts } from "./services/accountBootstrap.js";

try {
  await sequelize.authenticate();
  await bootstrapAccounts(["cashier", "kitchen"]);
} catch (error) {
  console.error("Account setup failed:", error.message);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
