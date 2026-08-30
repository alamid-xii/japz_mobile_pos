import { sequelize } from '../models/db.js';

/**
 * Scopes each Add-ons item to the categories it actually belongs with, so a
 * drink is no longer offered bacon. null means "offer everywhere", which is the
 * safe default for any add-on created later.
 */
async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database');

    const [columns] = await sequelize.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'menu_items'
      AND COLUMN_NAME = 'addonForCategoryIds'
    `);

    if (columns.length === 0) {
      await sequelize.query(`ALTER TABLE menu_items ADD COLUMN addonForCategoryIds JSON DEFAULT NULL`);
      console.log('✅ Added addonForCategoryIds column to menu_items');
    } else {
      console.log('✅ addonForCategoryIds column already exists');
    }

    // Resolve categories by name so the seed survives different id ordering.
    const [cats] = await sequelize.query(`SELECT id, name FROM menu_categories`);
    const idOf = (name) => {
      const c = cats.find(c => c.name.trim().toLowerCase() === name.toLowerCase());
      return c ? c.id : null;
    };

    const savoury = ['Burgers', 'Sandwiches', 'Pasta', 'Fries & Chips'].map(idOf).filter(Boolean);
    const drinks = ['Beverages', 'Coolers', 'Coffee'].map(idOf).filter(Boolean);

    // Only seeds add-ons that have not been scoped yet, so manual edits survive
    // a re-run of this migration.
    const SEED = [
      { name: 'Bacon', scope: savoury },
      { name: 'Cheese', scope: savoury },
      { name: 'Egg', scope: savoury },
      { name: 'Ham', scope: savoury },
      { name: 'Jalapeño', scope: savoury },
      { name: 'Lettuce', scope: savoury },
      { name: 'Extra Espresso Shot', scope: drinks },
    ];

    for (const { name, scope } of SEED) {
      const [rows] = await sequelize.query(
        `SELECT id, addonForCategoryIds FROM menu_items WHERE name = :name LIMIT 1`,
        { replacements: { name } },
      );
      if (!rows.length) {
        console.log(`⚠️  Add-on "${name}" not found, skipping`);
        continue;
      }
      if (rows[0].addonForCategoryIds) {
        console.log(`↷  "${name}" already scoped, leaving as is`);
        continue;
      }
      await sequelize.query(
        `UPDATE menu_items SET addonForCategoryIds = :scope WHERE id = :id`,
        { replacements: { scope: JSON.stringify(scope), id: rows[0].id } },
      );
      console.log(`✅ Scoped "${name}" to categories [${scope.join(', ')}]`);
    }
  } catch (error) {
    console.error('Migration error:', error.message);
  } finally {
    await sequelize.close();
  }
}

migrate();
