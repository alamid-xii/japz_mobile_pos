
/*
MIT License
 
Copyright (c) 2025 Christian I. Cabrera || XianFire Framework
Mindoro State University - Philippines

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import { Sequelize } from "sequelize";
import { sequelize } from "./models/db.js";
import "./models/index.js";
import { seed } from "./seed.js";
import { seedMenu } from "./seedMenu.js";
import inquirer from "inquirer";

// Connect without selecting a database so the configured local database can be created.
const dbName = process.env.DB_DATABASE || "japz_pos";
const rootSequelize = new Sequelize("", process.env.DB_USER || "root", process.env.DB_PASSWORD || "", {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  dialect: "mysql",
  logging: false,
});

const createDb = true;

if (createDb) {
  await rootSequelize.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
  console.log("✅ Database created (if it did not exist)");
}

try {
  await sequelize.authenticate();
  console.log("✅ Connected to MySQL database!");

  // Disable foreign key checks to allow dropping tables with FK constraints
  await sequelize.query("SET FOREIGN_KEY_CHECKS = 0");
  console.log("🔓 Foreign key checks disabled");

  await sequelize.sync({ force: true }); // Drops and recreates tables

  // Re-enable foreign key checks
  await sequelize.query("SET FOREIGN_KEY_CHECKS = 1");
  console.log("🔒 Foreign key checks re-enabled");

  console.log("✅ Tables created for all models!");

  // Run seeds
  console.log("🌱 Running seeds...");
  await seed();
  await seedMenu();
  console.log("✅ All seeds completed!");
} catch (err) {
  console.error("❌ Migration failed:", err);
} finally {
  process.exit();
}

