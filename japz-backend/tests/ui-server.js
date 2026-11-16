import "dotenv/config";
import crypto from "node:crypto";
import mysql from "mysql2/promise";
import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

process.env.JWT_SECRET = crypto.randomBytes(48).toString("base64url");

const name = `japz_ui_test_${Date.now()}`;
const connection = await mysql.createConnection({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
});
await connection.query(`CREATE DATABASE \`${name}\``);
for (const key of [
  "DATABASE_URL",
  "MYSQL_URL",
  "MYSQL_PUBLIC_URL",
  "MYSQLHOST",
  "MYSQL_HOST",
])
  delete process.env[key];
process.env.DB_DATABASE = name;
process.env.NODE_ENV = "test";
const { sequelize } = await import("../models/db.js");
const { User, MenuCategory, MenuItem } = await import("../models/index.js");
const { Supplier } = await import("../models/inventoryModels.js");
const service = await import("../services/inventoryService.js");
const { saveRecipe, saveMenuAvailability } =
  await import("../services/menuAvailability.js");
await sequelize.sync({ alter: false });
const accounts = {};
for (const role of ["admin", "inventory", "cashier", "kitchen"]) {
  const password = crypto.randomBytes(18).toString("base64url");
  const user = await User.create({
    name: `QA ${role}`,
    email: `${role}@inventory-test.local`,
    role,
    password: await bcrypt.hash(password, 4),
    status: "approved",
    assignedCategories: [],
  });
  accounts[role] = {
    user: user.toJSON(),
    password,
    token: jwt.sign(
      { id: user.id, role },
      process.env.JWT_SECRET,
    ),
  };
  delete accounts[role].user.password;
}
const supplier = await Supplier.create({
  name: "QA Supply Co",
  contact: "QA contact",
  active: true,
});
const supplies = [];
for (let index = 0; index < 14; index++) {
  const item = await service.saveStockItem({
    code: `QA-${String(index + 1).padStart(3, "0")}`,
    name:
      index === 0
        ? "QA Coffee beans"
        : index === 1
          ? "QA Takeaway cups"
          : `QA Supply ${index + 1}`,
    kind: index === 1 ? "packaging" : "ingredient",
    unit: index === 1 ? "pcs" : "g",
    purchaseUnit: index === 1 ? "box" : "kg",
    unitsPerPurchase: index === 1 ? 50 : 1000,
    reorderLevel: 10,
    adjustmentLimit: 5,
    supplierId: supplier.id,
    location: "QA Store",
  });
  await service.receiveStock(
    {
      requestId: crypto.randomUUID(),
      supplierId: supplier.id,
      reference: `QA Invoice ${index + 1}`,
      lines: [
        {
          stockItemId: item.id,
          quantity: index === 1 ? 12 : 100,
          unit: item.unit,
          unitCost: 1,
          expiryDate: service.businessDate(new Date(Date.now() + 3 * 86400000)),
        },
      ],
    },
    accounts.inventory.user,
  );
  supplies.push(item);
}
const category = await MenuCategory.create({
  name: "QA Beverages",
  status: "active",
});
const prepared = await MenuItem.create({
  name: "QA Prepared snack",
  price: 10,
  categoryId: category.id,
  stock: 20,
});
const coffee = await MenuItem.create({
  name: "QA Recipe coffee",
  price: 10,
  categoryId: category.id,
  stock: 0,
  hasSize: true,
  sizes: ["Small - ₱10", "Large - ₱20"],
});
await saveRecipe(
  coffee.id,
  {
    label: "Coffee recipe",
    expectedVersion: 0,
    components: [
      { type: "stock", stockItemId: supplies[0].id, quantity: 10 },
      {
        type: "stock",
        stockItemId: supplies[1].id,
        quantity: 1,
        useFor: "off-premise",
      },
    ],
  },
  accounts.inventory.user,
);
await saveRecipe(
  coffee.id,
  {
    label: "Large coffee",
    size: "Large",
    expectedVersion: 0,
    components: [
      { type: "stock", stockItemId: supplies[0].id, quantity: 20 },
      {
        type: "stock",
        stockItemId: supplies[1].id,
        quantity: 1,
        useFor: "off-premise",
      },
    ],
  },
  accounts.inventory.user,
);
await saveMenuAvailability(coffee.id, { inventoryMode: "recipe" });
const app = express();
app.use(cors());
app.use(express.json());
app.use((await import("../routes/index.js")).default);
const server = app.listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
// Credentials are emitted only to the parent test process and never saved in a file.
process.stdout.write(
  "QA_READY " +
    JSON.stringify({
      url: `http://127.0.0.1:${server.address().port}`,
      accounts,
      ids: {
        prepared: prepared.id,
        coffee: coffee.id,
        supply: supplies[0].id,
        cup: supplies[1].id,
      },
    }) +
    "\n",
);
let closing = false;
async function close() {
  if (closing) return;
  closing = true;
  await new Promise((resolve) => server.close(resolve));
  await sequelize.close();
  if (!/^japz_ui_test_\d+$/.test(name)) throw new Error("Unsafe test database");
  await connection.query(`DROP DATABASE \`${name}\``);
  await connection.end();
  process.exit(0);
}
process.on("SIGTERM", close);
process.on("SIGINT", close);
process.stdin.on("data", (data) => {
  if (data.toString().includes("STOP")) void close();
});
