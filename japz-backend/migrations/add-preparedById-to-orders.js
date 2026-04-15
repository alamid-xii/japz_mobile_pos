// Migration to add preparedById column to orders table
import { sequelize } from '../models/db.js';

async function migrate() {
  try {
    // Check if column already exists
    const [columns] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'orders' 
        AND COLUMN_NAME = 'preparedById'
    `);

    if (columns.length > 0) {
      console.log('Column preparedById already exists in orders table');
      process.exit(0);
    }

    // Add the preparedById column
    await sequelize.query(`
      ALTER TABLE orders 
      ADD COLUMN preparedById INT NULL 
      COMMENT 'Kitchen staff who prepared this order'
    `);

    console.log('Successfully added preparedById column to orders table');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
}

migrate();
