import { sequelize } from '../models/db.js';

/**
 * Kitchen → Cashier → Rider delivery workflow.
 *
 * Design notes:
 * - Per-item prep status lives on orderitems, so an order's overall readiness is
 *   derived from its items rather than being a second source of truth.
 * - Assignment and hand-off live in their own `deliveries` table rather than as
 *   extra order statuses. That keeps the existing POS status flow untouched and
 *   gives every delivery an auditable record with its own timestamps.
 */
async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database');

    const hasColumn = async (table, column) => {
      const [rows] = await sequelize.query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${table}' AND COLUMN_NAME = '${column}'
      `);
      return rows.length > 0;
    };

    // 1. Rider role -------------------------------------------------------
    const [roleCol] = await sequelize.query(`
      SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role'
    `);
    if (roleCol.length && !roleCol[0].COLUMN_TYPE.includes("'rider'")) {
      await sequelize.query(`
        ALTER TABLE users
        MODIFY COLUMN role ENUM('admin','cashier','kitchen','customer','rider')
        NOT NULL DEFAULT 'cashier'
      `);
      console.log('✅ Added rider to users.role');
    } else {
      console.log('✅ users.role already allows rider');
    }

    if (!(await hasColumn('users', 'availability'))) {
      await sequelize.query(`
        ALTER TABLE users ADD COLUMN availability
        ENUM('available','on-delivery','offline','inactive') NOT NULL DEFAULT 'offline'
      `);
      console.log('✅ Added users.availability');
    } else {
      console.log('✅ users.availability already exists');
    }

    // 2. Per-item preparation status --------------------------------------
    if (!(await hasColumn('orderitems', 'status'))) {
      await sequelize.query(`
        ALTER TABLE orderitems ADD COLUMN status
        ENUM('pending','preparing','ready') NOT NULL DEFAULT 'pending'
      `);
      console.log('✅ Added orderitems.status');
    } else {
      console.log('✅ orderitems.status already exists');
    }
    if (!(await hasColumn('orderitems', 'readyAt'))) {
      await sequelize.query(`ALTER TABLE orderitems ADD COLUMN readyAt DATETIME DEFAULT NULL`);
      console.log('✅ Added orderitems.readyAt');
    }

    // Existing completed orders should not look like they are still cooking.
    await sequelize.query(`
      UPDATE orderitems oi
      JOIN orders o ON o.id = oi.orderId
      SET oi.status = 'ready'
      WHERE o.status IN ('ready','out-for-delivery','completed')
    `);

    // 3. Deliveries --------------------------------------------------------
    const [tables] = await sequelize.query(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'deliveries'
    `);
    if (tables.length === 0) {
      await sequelize.query(`
        CREATE TABLE deliveries (
          id INT AUTO_INCREMENT PRIMARY KEY,
          orderId INT NOT NULL,
          riderId INT NOT NULL,
          assignedByUserId INT DEFAULT NULL,
          status ENUM('assigned','out-for-delivery','delivered','failed') NOT NULL DEFAULT 'assigned',
          assignedAt DATETIME NOT NULL,
          startedAt DATETIME DEFAULT NULL,
          deliveredAt DATETIME DEFAULT NULL,
          proofPhotoUrl VARCHAR(255) DEFAULT NULL,
          proofLat DECIMAL(10,7) DEFAULT NULL,
          proofLng DECIMAL(10,7) DEFAULT NULL,
          notes TEXT DEFAULT NULL,
          createdAt DATETIME NOT NULL,
          updatedAt DATETIME NOT NULL,
          UNIQUE KEY uniq_delivery_order (orderId),
          INDEX idx_deliveries_riderId (riderId),
          INDEX idx_deliveries_status (status)
        )
      `);
      console.log('✅ Created deliveries table');
    } else {
      console.log('✅ deliveries already exists');
    }

    // 4. Audit trail for order/delivery status changes ---------------------
    const [auditTables] = await sequelize.query(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'delivery_events'
    `);
    if (auditTables.length === 0) {
      await sequelize.query(`
        CREATE TABLE delivery_events (
          id INT AUTO_INCREMENT PRIMARY KEY,
          orderId INT NOT NULL,
          deliveryId INT DEFAULT NULL,
          actorUserId INT DEFAULT NULL,
          actorRole VARCHAR(32) DEFAULT NULL,
          event VARCHAR(64) NOT NULL,
          detail TEXT DEFAULT NULL,
          createdAt DATETIME NOT NULL,
          INDEX idx_delivery_events_orderId (orderId)
        )
      `);
      console.log('✅ Created delivery_events audit table');
    } else {
      console.log('✅ delivery_events already exists');
    }
  } catch (error) {
    console.error('Migration error:', error.message);
  } finally {
    await sequelize.close();
  }
}

migrate();
