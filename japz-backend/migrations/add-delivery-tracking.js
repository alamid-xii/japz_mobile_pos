import { sequelize } from '../models/db.js';

/**
 * Delivery tracking.
 *
 * There is no rider app reporting GPS, so nothing here pretends to know where a
 * rider is. What it stores is real: a dispatch timestamp, who is delivering,
 * the customer's own pinned coordinates, and an estimate window the restaurant
 * configures.
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

    // 1. A real delivery step between 'ready' and 'completed'.
    const [statusCol] = await sequelize.query(`
      SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'status'
    `);
    if (statusCol.length && !statusCol[0].COLUMN_TYPE.includes("'out-for-delivery'")) {
      await sequelize.query(`
        ALTER TABLE orders
        MODIFY COLUMN status
        ENUM('pending','preparing','ready','out-for-delivery','completed','cancelled')
        NOT NULL DEFAULT 'pending'
      `);
      console.log('✅ Added out-for-delivery to orders.status');
    } else {
      console.log('✅ orders.status already allows out-for-delivery');
    }

    const orderCols = [
      ['outForDeliveryAt', 'DATETIME DEFAULT NULL', 'when the order was dispatched'],
      ['riderName', 'VARCHAR(255) DEFAULT NULL', 'who is delivering it'],
      ['riderPhone', 'VARCHAR(255) DEFAULT NULL', 'rider contact for the customer'],
      // Customer-pinned coordinates. DECIMAL, not FLOAT, so the pin does not drift.
      ['deliveryLat', 'DECIMAL(10,7) DEFAULT NULL', 'customer-pinned latitude'],
      ['deliveryLng', 'DECIMAL(10,7) DEFAULT NULL', 'customer-pinned longitude'],
    ];

    for (const [name, type, note] of orderCols) {
      if (!(await hasColumn('orders', name))) {
        await sequelize.query(`ALTER TABLE orders ADD COLUMN ${name} ${type}`);
        console.log(`✅ Added orders.${name} (${note})`);
      } else {
        console.log(`✅ orders.${name} already exists`);
      }
    }

    // 2. The estimate window lives with the other business settings so staff can
    //    tune it without a code change.
    const settings = [
      ['deliveryEtaMinMinutes', 'INT NOT NULL DEFAULT 30'],
      ['deliveryEtaMaxMinutes', 'INT NOT NULL DEFAULT 45'],
    ];
    for (const [name, type] of settings) {
      if (!(await hasColumn('business_hours', name))) {
        await sequelize.query(`ALTER TABLE business_hours ADD COLUMN ${name} ${type}`);
        console.log(`✅ Added business_hours.${name}`);
      } else {
        console.log(`✅ business_hours.${name} already exists`);
      }
    }
  } catch (error) {
    console.error('Migration error:', error.message);
  } finally {
    await sequelize.close();
  }
}

migrate();
