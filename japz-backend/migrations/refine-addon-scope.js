import { sequelize } from '../models/db.js';

/**
 * Supersedes add-addon-scope.js, which grouped add-ons far too coarsely
 * (lettuce on lasagna, an espresso shot in halo-halo).
 *
 * Each add-on is scoped to the categories it genuinely belongs with on the
 * JAPZ menu. Categories are resolved by name so ids do not have to match, and
 * scopes are set explicitly, so re-running restores these canonical values.
 */

// category names -> which extras make sense with them
const SCOPES = {
  // Toppings that work on anything grilled and savoury.
  'Bacon': ['Burgers', 'Sandwiches', 'Pasta', 'Fries & Chips'],
  'Cheese': ['Burgers', 'Sandwiches', 'Pasta', 'Fries & Chips'],
  // An extra egg suits a burger, a sandwich, or a carbonara — not fries.
  'Egg': ['Burgers', 'Sandwiches', 'Pasta'],
  // Ham belongs in handhelds only.
  'Ham': ['Burgers', 'Sandwiches'],
  // Jalapeño works on handhelds and on nachos, not on Italian pasta.
  'Jalapeño': ['Burgers', 'Sandwiches', 'Fries & Chips'],
  // Lettuce only makes sense in something you hold.
  'Lettuce': ['Burgers', 'Sandwiches'],
  // Coffee only. Beverages are teas and lemonades; Coolers are frozen desserts.
  'Extra Espresso Shot': ['Coffee'],
};

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
    }

    const [cats] = await sequelize.query(`SELECT id, name FROM menu_categories`);
    const idOf = (name) => {
      const c = cats.find(c => c.name.trim().toLowerCase() === name.toLowerCase());
      if (!c) console.log(`⚠️  Category "${name}" not found`);
      return c ? c.id : null;
    };

    for (const [addon, categoryNames] of Object.entries(SCOPES)) {
      const scope = categoryNames.map(idOf).filter(Boolean);

      const [rows] = await sequelize.query(
        `SELECT id FROM menu_items WHERE name = :name LIMIT 1`,
        { replacements: { name: addon } },
      );
      if (!rows.length) {
        console.log(`⚠️  Add-on "${addon}" not found, skipping`);
        continue;
      }

      await sequelize.query(
        `UPDATE menu_items SET addonForCategoryIds = :scope WHERE id = :id`,
        { replacements: { scope: JSON.stringify(scope), id: rows[0].id } },
      );
      console.log(`✅ ${addon.padEnd(20)} -> ${categoryNames.join(', ')}`);
    }

    // Anything else sitting in Add-ons has no scope yet and would show up
    // everywhere, so surface it rather than letting it slip through.
    const [addonCat] = await sequelize.query(
      `SELECT id FROM menu_categories WHERE LOWER(TRIM(name)) = 'add-ons' LIMIT 1`
    );
    if (addonCat.length) {
      const [unscoped] = await sequelize.query(
        `SELECT name FROM menu_items WHERE categoryId = :cid AND addonForCategoryIds IS NULL`,
        { replacements: { cid: addonCat[0].id } },
      );
      if (unscoped.length) {
        console.log('\n⚠️  Unscoped add-ons (these will appear on EVERY item):');
        unscoped.forEach(u => console.log('   -', u.name));
      } else {
        console.log('\n✅ Every add-on is scoped.');
      }
    }
  } catch (error) {
    console.error('Migration error:', error.message);
  } finally {
    await sequelize.close();
  }
}

migrate();
