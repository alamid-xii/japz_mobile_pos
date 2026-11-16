import { sequelize } from '../models/db.js';

async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database');

    const [columns] = await sequelize.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'menu_items'
      AND COLUMN_NAME = 'imageUrl'
    `);

    if (columns.length === 0) {
      await sequelize.query(`ALTER TABLE menu_items ADD COLUMN imageUrl VARCHAR(255) DEFAULT NULL`);
      console.log('✅ Added imageUrl column to menu_items table');
    } else {
      console.log('✅ imageUrl column already exists');
    }
  } catch (error) {
    console.error('Migration error:', error.message);
  } finally {
    await sequelize.close();
  }
}

migrate();
