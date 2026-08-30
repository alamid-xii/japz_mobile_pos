import { sequelize } from '../models/db.js';

/**
 * Customer accounts for the online storefront.
 *
 * Staff registration creates role='cashier', status='pending' and waits for an
 * admin to approve it. A customer cannot wait for approval to buy a burger, so
 * customers get their own role and are approved on creation.
 */
async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database');

    // 1. role enum gains 'customer'
    const [roleCol] = await sequelize.query(`
      SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role'
    `);
    if (roleCol.length && !roleCol[0].COLUMN_TYPE.includes("'customer'")) {
      await sequelize.query(`
        ALTER TABLE users
        MODIFY COLUMN role ENUM('admin','cashier','kitchen','customer') NOT NULL DEFAULT 'cashier'
      `);
      console.log('✅ Added customer to users.role');
    } else {
      console.log('✅ users.role already allows customer');
    }

    // 2. customers need a contact number on the account
    const [phoneCol] = await sequelize.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'phone'
    `);
    if (phoneCol.length === 0) {
      await sequelize.query(`ALTER TABLE users ADD COLUMN phone VARCHAR(255) DEFAULT NULL`);
      console.log('✅ Added phone to users');
    } else {
      console.log('✅ users.phone already exists');
    }

    // 3. orders link back to the account that placed them
    const [orderCol] = await sequelize.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'customerUserId'
    `);
    if (orderCol.length === 0) {
      await sequelize.query(`ALTER TABLE orders ADD COLUMN customerUserId INT DEFAULT NULL`);
      await sequelize.query(`CREATE INDEX idx_orders_customerUserId ON orders (customerUserId)`);
      console.log('✅ Added customerUserId to orders');
    } else {
      console.log('✅ orders.customerUserId already exists');
    }

    // 4. remember the last status a customer was shown, so "new" updates can be
    //    detected without a separate notifications table
    const [seenCol] = await sequelize.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'customerSeenStatus'
    `);
    if (seenCol.length === 0) {
      await sequelize.query(`ALTER TABLE orders ADD COLUMN customerSeenStatus VARCHAR(32) DEFAULT NULL`);
      console.log('✅ Added customerSeenStatus to orders');
    } else {
      console.log('✅ orders.customerSeenStatus already exists');
    }
  } catch (error) {
    console.error('Migration error:', error.message);
  } finally {
    await sequelize.close();
  }
}

migrate();
