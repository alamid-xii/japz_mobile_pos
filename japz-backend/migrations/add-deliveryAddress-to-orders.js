import { sequelize } from '../models/db.js';

async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database');
    
    // Check if column exists first
    const [columns] = await sequelize.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'orders' 
      AND COLUMN_NAME = 'deliveryAddress'
    `);
    
    if (columns.length === 0) {
      // Add deliveryAddress column to orders table
      await sequelize.query(`ALTER TABLE orders ADD COLUMN deliveryAddress TEXT DEFAULT NULL`);
      console.log('✅ Added deliveryAddress column to orders table');
    } else {
      console.log('✅ deliveryAddress column already exists');
    }
    
  } catch (error) {
    console.error('Migration error:', error.message);
  } finally {
    await sequelize.close();
  }
}

migrate();
