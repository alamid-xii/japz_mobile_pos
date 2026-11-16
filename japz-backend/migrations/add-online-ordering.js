import { sequelize } from '../models/db.js';

const columnExists = async (table, column) => {
  const [rows] = await sequelize.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = '${table}'
    AND COLUMN_NAME = '${column}'
  `);
  return rows.length > 0;
};

async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database');

    if (!(await columnExists('orders', 'customerPhone'))) {
      await sequelize.query(`ALTER TABLE orders ADD COLUMN customerPhone VARCHAR(255) DEFAULT NULL`);
      console.log('✅ Added customerPhone column to orders table');
    } else {
      console.log('✅ customerPhone column already exists');
    }

    if (!(await columnExists('orders', 'source'))) {
      // Existing rows are all in-store, so 'pos' is the correct backfill.
      await sequelize.query(`ALTER TABLE orders ADD COLUMN source ENUM('pos','online') NOT NULL DEFAULT 'pos'`);
      console.log('✅ Added source column to orders table');
    } else {
      console.log('✅ source column already exists');
    }

    // Widen the payment status enum so an online order can sit unpaid.
    // Existing rows keep their value; the default stays 'completed' so the POS flow is untouched.
    const [statusCol] = await sequelize.query(`
      SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'payments'
      AND COLUMN_NAME = 'status'
    `);
    if (statusCol.length && !statusCol[0].COLUMN_TYPE.includes("'pending'")) {
      await sequelize.query(`
        ALTER TABLE payments
        MODIFY COLUMN status ENUM('pending','completed','failed') NOT NULL DEFAULT 'completed'
      `);
      console.log('✅ Added pending state to payments.status');
    } else {
      console.log('✅ payments.status already allows pending');
    }

  } catch (error) {
    console.error('Migration error:', error.message);
  } finally {
    await sequelize.close();
  }
}

migrate();
