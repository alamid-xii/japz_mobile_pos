import { sequelize } from '../models/db.js';

/**
 * Saved delivery addresses, so a returning customer picks instead of retyping
 * and re-pinning. Scoped to one account; nothing here is shared between users.
 */
async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database');

    const [tables] = await sequelize.query(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customer_addresses'
    `);

    if (tables.length === 0) {
      await sequelize.query(`
        CREATE TABLE customer_addresses (
          id INT AUTO_INCREMENT PRIMARY KEY,
          userId INT NOT NULL,
          label VARCHAR(64) DEFAULT NULL,
          address TEXT NOT NULL,
          lat DECIMAL(10,7) DEFAULT NULL,
          lng DECIMAL(10,7) DEFAULT NULL,
          isDefault BOOLEAN NOT NULL DEFAULT FALSE,
          lastUsedAt DATETIME DEFAULT NULL,
          createdAt DATETIME NOT NULL,
          updatedAt DATETIME NOT NULL,
          INDEX idx_customer_addresses_userId (userId)
        )
      `);
      console.log('✅ Created customer_addresses table');
    } else {
      console.log('✅ customer_addresses already exists');
    }

    // Orders record which saved address was used, so history stays meaningful
    // even if the address is later edited or removed.
    const [col] = await sequelize.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'deliveryAddressId'
    `);
    if (col.length === 0) {
      await sequelize.query(`ALTER TABLE orders ADD COLUMN deliveryAddressId INT DEFAULT NULL`);
      console.log('✅ Added orders.deliveryAddressId');
    } else {
      console.log('✅ orders.deliveryAddressId already exists');
    }
  } catch (error) {
    console.error('Migration error:', error.message);
  } finally {
    await sequelize.close();
  }
}

migrate();
