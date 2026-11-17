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
import publicOrdersRouter from "./routes/publicOrders.js";
import customerAuthRouter from "./routes/customerAuth.js";
import menuImagesRouter from "./routes/menuImages.js";
import deliveryRouter from "./routes/delivery.js";
import reservationsRouter from "./routes/reservations.js";
import paymentsRouter from "./routes/payments.js";
import { assertProtectedSchemaReady } from "./services/integrationSchema.js";
import { seedDefaultConfigs } from "./services/payrollConfigService.js";

import fs from 'fs';
import hbs from "hbs";
import cors from "cors";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { sequelize } from "./models/userModel.js";
import { User, Order, OrderItem, Payment, MenuItem, Log } from "./models/index.js";

import { upgradeInventorySchema } from './services/inventorySchema.js';
import { requireJwtSecret } from './services/securityConfig.js';
import { bootstrapAccounts } from './services/accountBootstrap.js';
import { startAttendanceScheduler } from './services/attendanceAutoClockOut.js';
import { blockPublicProofFiles } from './middleware/privateProofFiles.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = requireJwtSecret();

// API data includes current menu prices, identities and payments. Keep it out
// of browser/proxy caches; the ordering worker only caches static files.
app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store, private'); next(); });

if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY));
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use(cors());
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));
app.use(express.urlencoded({ extended: true }));
app.use(blockPublicProofFiles);
app.use(express.static(path.join(process.cwd(), "public")));

app.use(session({
  secret: JWT_SECRET,
  resave: false,
  saveUninitialized: false
}));
app.use(flash());

await assertProtectedSchemaReady(sequelize);

// Sync database with proper handling for local dev & Railway MySQL
console.log('🔧 Starting database sync...');
try {
  // First, verify the connection is alive
  await sequelize.authenticate();
  console.log('  ✓ Database connection established');

  // Disable foreign key checks for initial sync
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
  console.log('  ✓ Foreign key checks disabled');

  await upgradeInventorySchema();

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

  // Re-enable foreign key checks
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
  console.log('  ✓ Foreign key checks re-enabled');

  // Retain historical employee records after consolidating active users.
  console.log('  ✓ Historical employee records retained');

  // Ensure existing admin users have approved status
  await User.update({ status: 'approved' }, { where: { role: 'admin', status: 'pending' } });

  // Create an admin only from explicitly configured private credentials.
  const adminCount = await User.count({ where: { role: 'admin' } });
  if (adminCount === 0) {
    await bootstrapAccounts(['admin']);
    if (!(await User.count({ where: { role: 'admin' } }))) {
      console.log('  No admin account configured. Set private BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD for first-time setup.');
    }
  } else {
    console.log(`  ✓ ${adminCount} admin account(s) verified`);
  }

  console.log('Database ready. Inventory balances retained.');
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
      await upgradeInventorySchema();
      await sequelize.sync({ alter: false });
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
      await bootstrapAccounts(['admin']);
      console.log('✅ Database fully synced (after auto-create)');
    } catch (createErr) {
      console.error('❌ Could not auto-create database:', createErr.message);
    }
  } else {
    // Make sure foreign key checks are re-enabled
    try {
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    } catch (e) { }
    throw syncError;
  }
}

await seedDefaultConfigs();

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

app.use("/", deliveryRouter);
app.use("/", reservationsRouter);
app.use("/", paymentsRouter);
app.use("/", menuImagesRouter);
app.use("/", customerAuthRouter);
app.use("/", publicOrdersRouter);
app.use("/", router);

export default app;

if (!process.env.ELECTRON) {
  let stopAttendance;
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🔥 XianFire running on port ${PORT}`);
    if (process.env.NODE_ENV !== 'test') stopAttendance = startAttendanceScheduler();
  });
  server.once('close',() => stopAttendance?.());
}
