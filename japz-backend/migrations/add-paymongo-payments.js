import { sequelize } from '../models/db.js';

/**
 * PayMongo hosted checkout.
 *
 * Adds the `awaiting-payment` order status. An order paid through a gateway
 * must NOT reach the kitchen before the money is confirmed, and every kitchen
 * and cashier query selects on status, so a new state is the safe way to hold
 * it back without touching those queries.
 */
async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database\n');

    const tableExists = async (name) => {
      const [rows] = await sequelize.query(`
        SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${name}'
      `);
      return rows.length > 0;
    };
    const hasColumn = async (table, column) => {
      const [rows] = await sequelize.query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${table}' AND COLUMN_NAME = '${column}'
      `);
      return rows.length > 0;
    };

    // ---------- order status ----------
    const [col] = await sequelize.query(`
      SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'status'
    `);
    if (col.length && !col[0].COLUMN_TYPE.includes('awaiting-payment')) {
      await sequelize.query(`
        ALTER TABLE orders MODIFY COLUMN status
        ENUM('awaiting-payment','pending','preparing','ready','out-for-delivery','completed','cancelled')
        NOT NULL DEFAULT 'pending'
      `);
      console.log('✅ orders.status now allows awaiting-payment');
    } else {
      console.log('✅ orders.status already allows awaiting-payment');
    }

    // ---------- payment sessions ----------
    if (!(await tableExists('payment_sessions'))) {
      await sequelize.query(`
        CREATE TABLE payment_sessions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          orderId INT NOT NULL,
          orderNumber VARCHAR(32) NOT NULL,
          sessionId VARCHAR(64) NOT NULL UNIQUE,
          checkoutUrl VARCHAR(512) NOT NULL,
          amount INT NOT NULL,
          methods VARCHAR(128) DEFAULT NULL,
          status ENUM('pending','paid','failed','expired','cancelled') NOT NULL DEFAULT 'pending',
          source ENUM('online','pos') NOT NULL DEFAULT 'online',
          paymentId VARCHAR(64) DEFAULT NULL,
          paidMethod VARCHAR(32) DEFAULT NULL,
          paidAt DATETIME DEFAULT NULL,
          confirmedVia VARCHAR(16) DEFAULT NULL,
          createdByUserId INT DEFAULT NULL,
          lastError VARCHAR(255) DEFAULT NULL,
          createdAt DATETIME NOT NULL,
          updatedAt DATETIME NOT NULL,
          INDEX idx_ps_order (orderId),
          INDEX idx_ps_ordernum (orderNumber),
          INDEX idx_ps_status (status)
        )
      `);
      console.log('✅ Created payment_sessions');
    } else {
      console.log('✅ payment_sessions already exists');
    }

    // ---------- payments ----------
    // 'digital' already exists for GCash; the gateway provider and its payment
    // id are recorded so a payment can be traced back to PayMongo.
    for (const [name, type] of [
      ['gatewayPaymentId', 'VARCHAR(64) DEFAULT NULL'],
      ['paidAt', 'DATETIME DEFAULT NULL'],
    ]) {
      if (!(await hasColumn('payments', name))) {
        await sequelize.query(`ALTER TABLE payments ADD COLUMN ${name} ${type}`);
        console.log(`✅ Added payments.${name}`);
      } else {
        console.log(`✅ payments.${name} already exists`);
      }
    }

    console.log('\n📋 Configuration');
    const configured = String(process.env.PAYMONGO_SECRET_KEY || '').startsWith('sk_');
    if (configured) {
      const mode = process.env.PAYMONGO_SECRET_KEY.startsWith('sk_test') ? 'TEST' : 'LIVE';
      console.log(`   PAYMONGO_SECRET_KEY is set (${mode} mode).`);
      if (!process.env.PAYMONGO_WEBHOOK_SECRET) {
        console.log('   ⚠️  PAYMONGO_WEBHOOK_SECRET is NOT set — webhooks will be rejected.');
      }
    } else {
      console.log('   ⚠️  PAYMONGO_SECRET_KEY is not set.');
      console.log('      Card and GCash stay switched off until it is; cash still works.');
      console.log('      Add your keys to japz-backend/.env (see .env.example).');
    }

    console.log('\n✅ Migration complete');
  } catch (error) {
    console.error('Migration error:', error.message);
  } finally {
    await sequelize.close();
  }
}

migrate();
