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

import 'dotenv/config';
import express from "express";
import path from "path";
import session from "express-session";
import flash from "connect-flash";
import router from "./routes/index.js";
import fs from 'fs';
import hbs from "hbs";
import cors from "cors";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { sequelize } from "./models/userModel.js";
import { User, Order, OrderItem, Payment, MenuItem, Log } from "./models/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(process.cwd(), "public")));

app.use(session({
  secret: process.env.JWT_SECRET || "xianfire-secret-key",
  resave: false,
  saveUninitialized: false
}));
app.use(flash());

// Sync database with proper handling for local dev & Railway MySQL
console.log('🔧 Starting database sync...');
try {
  // First, verify the connection is alive
  await sequelize.authenticate();
  console.log('  ✓ Database connection established');

  // Disable foreign key checks for initial sync
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
  console.log('  ✓ Foreign key checks disabled');

  // Sync all tables
  await sequelize.sync({ alter: false });
  console.log('  ✓ All tables synced');

  // Manually add new stock columns if they don't exist (avoids alter:true key limit issue)
  try {
    await sequelize.query(`ALTER TABLE menu_items ADD COLUMN defaultStock INT NOT NULL DEFAULT 0`);
    console.log('  ✓ Added defaultStock column');
  } catch (e) { if (!e.message.includes('Duplicate')) console.log('  ✓ defaultStock column exists'); }
  try {
    await sequelize.query(`ALTER TABLE menu_items ADD COLUMN lastStockReset DATE DEFAULT NULL`);
    console.log('  ✓ Added lastStockReset column');
  } catch (e) { if (!e.message.includes('Duplicate')) console.log('  ✓ lastStockReset column exists'); }
  try {
    await sequelize.query(`ALTER TABLE menu_items ADD COLUMN archived TINYINT(1) NOT NULL DEFAULT 0`);
    console.log('  ✓ Added archived column');
  } catch (e) { if (!e.message.includes('Duplicate')) console.log('  ✓ archived column exists'); }
  try {
    await sequelize.query(`ALTER TABLE discounts ADD COLUMN enabled TINYINT(1) NOT NULL DEFAULT 1`);
    console.log('  ✓ Added enabled column to discounts');
  } catch (e) { if (!e.message.includes('Duplicate')) console.log('  ✓ enabled column exists in discounts'); }
  try {
    await sequelize.query(`ALTER TABLE vouchers ADD COLUMN enabled TINYINT(1) NOT NULL DEFAULT 1`);
    console.log('  ✓ Added enabled column to vouchers');
  } catch (e) { if (!e.message.includes('Duplicate')) console.log('  ✓ enabled column exists in vouchers'); }
  try {
    await sequelize.query(`ALTER TABLE vouchers ADD COLUMN startDate DATETIME`);
    console.log('  ✓ Added startDate column to vouchers');
  } catch (e) { if (!e.message.includes('Duplicate')) console.log('  ✓ startDate column exists in vouchers'); }
  try {
    await sequelize.query(`ALTER TABLE vouchers ADD COLUMN endDate DATETIME`);
    console.log('  ✓ Added endDate column to vouchers');
  } catch (e) { if (!e.message.includes('Duplicate')) console.log('  ✓ endDate column exists in vouchers'); }
  try {
    await sequelize.query(`ALTER TABLE vouchers MODIFY COLUMN used TINYINT(1) NOT NULL DEFAULT 0`);
    console.log('  ✓ Converted used column to BOOLEAN in vouchers');
  } catch (e) { if (!e.message.includes('Duplicate')) console.log('  ✓ used column is BOOLEAN in vouchers'); }

  // Add per-item status tracking columns to OrderItems
  try {
    await sequelize.query(`ALTER TABLE OrderItems ADD COLUMN status ENUM('pending','preparing','ready') NOT NULL DEFAULT 'pending'`);
    console.log('  ✓ Added status column to OrderItems');
  } catch (e) { if (!e.message.includes('Duplicate')) console.log('  ✓ status column exists in OrderItems'); }
  try {
    await sequelize.query(`ALTER TABLE OrderItems ADD COLUMN preparedById INT DEFAULT NULL`);
    console.log('  ✓ Added preparedById column to OrderItems');
  } catch (e) { if (!e.message.includes('Duplicate')) console.log('  ✓ preparedById column exists in OrderItems'); }

  // Add hourlyRate to Users table if it doesn't exist
  try {
    await sequelize.query(`ALTER TABLE Users ADD COLUMN hourlyRate DECIMAL(10, 2) NOT NULL DEFAULT 75.00`);
    console.log('  ✓ Added hourlyRate column to Users');
  } catch (e) { if (!e.message.includes('Duplicate')) console.log('  ✓ hourlyRate column exists in Users'); }

  // Ensure existing admin users have approved status
  await User.update({ status: 'approved' }, { where: { role: 'admin', status: 'pending' } });

  // Seed default admin account if none exists
  const adminCount = await User.count({ where: { role: 'admin' } });
  if (adminCount === 0) {
    const bcryptModule = await import('bcrypt');
    const hashed = await bcryptModule.default.hash('password', 10);
    await User.create({ name: 'Admin', email: 'admin@gmail.com', password: hashed, role: 'admin', status: 'approved' });
    console.log('  ✓ Default admin account created (admin@gmail.com / password)');
  } else {
    console.log(`  ✓ ${adminCount} admin account(s) verified`);
  }

  // Migrate existing items: ensure all have trackStock = true and stock is not null
  await sequelize.query(`UPDATE menu_items SET trackStock = 1 WHERE trackStock = 0`);
  await sequelize.query(`UPDATE menu_items SET stock = 0 WHERE stock IS NULL`);
  // Sync: if admin set a defaultStock but stock is still 0, fix it
  await sequelize.query(`UPDATE menu_items SET stock = defaultStock WHERE stock = 0 AND defaultStock > 0`);
  console.log('  ✓ All menu items migrated and stock synced');

  // Daily stock reset: reset stock to defaultStock for items not yet reset today
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const { Op } = await import('sequelize');
  const itemsToReset = await MenuItem.findAll({
    where: {
      [Op.or]: [
        { lastStockReset: null },
        { lastStockReset: { [Op.lt]: today } }
      ]
    }
  });
  if (itemsToReset.length > 0) {
    for (const item of itemsToReset) {
      await item.update({ stock: item.defaultStock || 0, lastStockReset: today });
    }
    console.log(`  ✓ Daily stock reset applied to ${itemsToReset.length} item(s)`);
  } else {
    console.log('  ✓ Stock already reset for today');
  }

  // Seed default payroll configuration values if table is empty
  const { seedDefaultConfigs } = await import('./services/payrollConfigService.js');
  await seedDefaultConfigs();

  // Re-enable foreign key checks
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
  console.log('  ✓ Foreign key checks re-enabled');

  console.log('✅ Database fully synced');
} catch (syncError) {
  console.error('⚠️ Database sync error:', syncError.message);

  // If the database doesn't exist, try to create it automatically (local dev)
  if (syncError.original && syncError.original.errno === 1049) {
    const dbName = process.env.DB_DATABASE || 'japz_pos';
    console.log(`📦 Database '${dbName}' not found — attempting to create it...`);
    try {
      const { Sequelize } = await import('sequelize');
      const tempSeq = new Sequelize('', process.env.DB_USER || 'root', process.env.DB_PASSWORD || '', {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        dialect: 'mysql',
        logging: false
      });
      await tempSeq.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
      await tempSeq.close();
      console.log(`  ✓ Database '${dbName}' created. Retrying sync...`);

      // Retry sync
      await sequelize.authenticate();
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
      await sequelize.sync();
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
      console.log('✅ Database fully synced (after auto-create)');
    } catch (createErr) {
      console.error('❌ Could not auto-create database:', createErr.message);
    }
  } else {
    // Make sure foreign key checks are re-enabled
    try {
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    } catch (e) { }
    console.log('⚠️ Server will continue despite sync issues');
  }
}

app.engine("xian", async (filePath, options, callback) => {
  try {
    const originalPartialsDir = hbs.partialsDir;
    hbs.partialsDir = path.join(__dirname, 'views');

    const result = await new Promise((resolve, reject) => {
      hbs.__express(filePath, options, (err, html) => {
        if (err) return reject(err);
        resolve(html);
      });
    });

    hbs.partialsDir = originalPartialsDir;
    callback(null, result);
  } catch (err) {
    callback(err);
  }
});
app.use((req, res, next) => {
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  next();
});


app.set("views", path.join(__dirname, "views"));
app.set("view engine", "xian");
const partialsDir = path.join(__dirname, "views/partials");
fs.readdir(partialsDir, (err, files) => {
  if (err) {
    console.error("❌ Could not read partials directory:", err);
    return;
  }

  files
    .filter(file => file.endsWith('.xian'))
    .forEach(file => {
      const partialName = file.replace('.xian', '');
      const fullPath = path.join(partialsDir, file);

      fs.readFile(fullPath, 'utf8', (err, content) => {
        if (err) {
          console.error(`❌ Failed to read partial: ${file}`, err);
          return;
        }
        hbs.registerPartial(partialName, content);

      });
    });
});

app.use("/", router);

export default app;

if (!process.env.ELECTRON) {
  app.listen(PORT, '0.0.0.0', () => console.log(`🔥 XianFire running on port ${PORT}`));
}