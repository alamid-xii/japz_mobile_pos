import { sequelize } from '../models/db.js';

/**
 * The restaurant's own coordinates, so the delivery map can draw a line from
 * JAPZ to the customer. Left NULL on purpose: nothing should invent where the
 * store is, and the map simply omits the line until it is set.
 */
async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database');

    const hasColumn = async (column) => {
      const [rows] = await sequelize.query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'business_hours' AND COLUMN_NAME = '${column}'
      `);
      return rows.length > 0;
    };

    for (const [name, type] of [
      ['storeLat', 'DECIMAL(10,7) DEFAULT NULL'],
      ['storeLng', 'DECIMAL(10,7) DEFAULT NULL'],
    ]) {
      if (!(await hasColumn(name))) {
        await sequelize.query(`ALTER TABLE business_hours ADD COLUMN ${name} ${type}`);
        console.log(`✅ Added business_hours.${name}`);
      } else {
        console.log(`✅ business_hours.${name} already exists`);
      }
    }

    const [rows] = await sequelize.query(`SELECT storeLat, storeLng FROM business_hours LIMIT 1`);
    if (rows.length && rows[0].storeLat == null) {
      console.log('\n⚠️  Store location is not set yet, so no line will be drawn.');
      console.log('   Set it with the admin business-hours endpoint, or directly:');
      console.log("   UPDATE business_hours SET storeLat=<lat>, storeLng=<lng>;");
    }
  } catch (error) {
    console.error('Migration error:', error.message);
  } finally {
    await sequelize.close();
  }
}

migrate();
