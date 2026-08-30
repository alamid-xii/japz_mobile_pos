import { sequelize } from '../models/db.js';

/**
 * Lets staff choose what the storefront promotes, instead of the hero always
 * being whatever sold most.
 *
 * Kept separate from the automatic BEST SELLER badge on purpose: that badge is
 * a fact derived from real sales, while this is the restaurant's own pick and
 * is labelled as such.
 */
async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database');

    const hasColumn = async (column) => {
      const [rows] = await sequelize.query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'menu_items' AND COLUMN_NAME = '${column}'
      `);
      return rows.length > 0;
    };

    for (const [name, type] of [
      ['featured', 'BOOLEAN NOT NULL DEFAULT FALSE'],
      ['featuredLabel', 'VARCHAR(40) DEFAULT NULL'],
    ]) {
      if (!(await hasColumn(name))) {
        await sequelize.query(`ALTER TABLE menu_items ADD COLUMN ${name} ${type}`);
        console.log(`✅ Added menu_items.${name}`);
      } else {
        console.log(`✅ menu_items.${name} already exists`);
      }
    }
  } catch (error) {
    console.error('Migration error:', error.message);
  } finally {
    await sequelize.close();
  }
}

migrate();
