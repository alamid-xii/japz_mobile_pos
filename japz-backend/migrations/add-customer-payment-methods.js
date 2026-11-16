import { sequelize } from '../models/db.js';

/**
 * Customer-chosen payment methods for online orders.
 *
 * There is no payment gateway wired up, so nothing here CHARGES anyone. What it
 * records is the method the customer intends to use and, for an e-wallet
 * transfer, the reference number staff can check against their own app. The
 * payment stays 'pending' until a human confirms it.
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

    for (const [table, name, type] of [
      ['payments', 'provider', "VARCHAR(32) DEFAULT NULL"],
      ['payments', 'reference', "VARCHAR(64) DEFAULT NULL"],
      // Where customers should send an e-wallet transfer. NULL means the option
      // is hidden — no invented account number is ever shown.
      ['business_hours', 'gcashNumber', "VARCHAR(32) DEFAULT NULL"],
      ['business_hours', 'gcashName', "VARCHAR(120) DEFAULT NULL"],
    ]) {
      if (!(await hasColumn(table, name))) {
        await sequelize.query(`ALTER TABLE ${table} ADD COLUMN ${name} ${type}`);
        console.log(`✅ Added ${table}.${name}`);
      } else {
        console.log(`✅ ${table}.${name} already exists`);
      }
    }

    const [rows] = await sequelize.query(`SELECT gcashNumber FROM business_hours LIMIT 1`);
    if (rows.length && !rows[0].gcashNumber) {
      console.log('\n⚠️  No GCash number set, so that option stays hidden at checkout.');
      console.log('   Set it with: UPDATE business_hours SET gcashNumber=\'09XXXXXXXXX\', gcashName=\'Account Name\';');
    }
  } catch (error) {
    console.error('Migration error:', error.message);
  } finally {
    await sequelize.close();
  }
}

migrate();
