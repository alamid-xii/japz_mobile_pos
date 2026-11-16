import { sequelize } from '../models/db.js';

/**
 * Payroll (attendance -> periods -> payslips) and table reservations.
 *
 * Contribution rates are created at 0 and `ratesConfigured` at false on
 * purpose. Real SSS / PhilHealth / Pag-IBIG / BIR figures are published bracket
 * tables that change; this migration will not invent them. The admin enters
 * their own in Settings, and payroll refuses to finalize until they do.
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

    const create = async (name, sql) => {
      if (await tableExists(name)) {
        console.log(`✅ ${name} already exists`);
        return;
      }
      await sequelize.query(sql);
      console.log(`✅ Created ${name}`);
    };

    // ---------- payroll ----------

    for (const [name, type] of [
      ['payType', "ENUM('hourly','monthly') NOT NULL DEFAULT 'hourly'"],
      ['payRate', 'DECIMAL(10,2) NOT NULL DEFAULT 0.00'],
    ]) {
      if (!(await hasColumn('users', name))) {
        await sequelize.query(`ALTER TABLE users ADD COLUMN ${name} ${type}`);
        console.log(`✅ Added users.${name}`);
      } else {
        console.log(`✅ users.${name} already exists`);
      }
    }

    await create('attendance_logs', `
      CREATE TABLE attendance_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        workDate DATE NOT NULL,
        clockInAt DATETIME NOT NULL,
        clockOutAt DATETIME DEFAULT NULL,
        minutesWorked INT DEFAULT NULL,
        closedByUserId INT DEFAULT NULL,
        notes VARCHAR(255) DEFAULT NULL,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        INDEX idx_attendance_user_date (userId, workDate),
        INDEX idx_attendance_open (userId, clockOutAt)
      )
    `);

    await create('payroll_periods', `
      CREATE TABLE payroll_periods (
        id INT AUTO_INCREMENT PRIMARY KEY,
        label VARCHAR(64) NOT NULL,
        startDate DATE NOT NULL,
        endDate DATE NOT NULL,
        status ENUM('draft','finalized') NOT NULL DEFAULT 'draft',
        createdById INT DEFAULT NULL,
        finalizedById INT DEFAULT NULL,
        finalizedAt DATETIME DEFAULT NULL,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        INDEX idx_period_dates (startDate, endDate)
      )
    `);

    await create('payslips', `
      CREATE TABLE payslips (
        id INT AUTO_INCREMENT PRIMARY KEY,
        periodId INT NOT NULL,
        userId INT NOT NULL,
        employeeName VARCHAR(128) NOT NULL,
        payType ENUM('hourly','monthly') NOT NULL DEFAULT 'hourly',
        payRate DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        daysWorked INT NOT NULL DEFAULT 0,
        regularHours DECIMAL(8,2) NOT NULL DEFAULT 0.00,
        overtimeHours DECIMAL(8,2) NOT NULL DEFAULT 0.00,
        overtimeMultiplier DECIMAL(4,2) NOT NULL DEFAULT 1.25,
        basicPay DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        overtimePay DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        grossPay DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        deductions JSON DEFAULT NULL,
        otherDeductionLabel VARCHAR(64) DEFAULT NULL,
        otherDeductionAmount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        totalDeductions DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        netPay DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        notes VARCHAR(255) DEFAULT NULL,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        UNIQUE KEY uniq_payslip (periodId, userId),
        INDEX idx_payslip_user (userId)
      )
    `);

    await create('payroll_settings', `
      CREATE TABLE payroll_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        standardHoursPerDay DECIMAL(4,2) NOT NULL DEFAULT 8.00,
        overtimeMultiplier DECIMAL(4,2) NOT NULL DEFAULT 1.25,
        sssRate DECIMAL(6,4) NOT NULL DEFAULT 0.0000,
        philhealthRate DECIMAL(6,4) NOT NULL DEFAULT 0.0000,
        pagibigRate DECIMAL(6,4) NOT NULL DEFAULT 0.0000,
        taxRate DECIMAL(6,4) NOT NULL DEFAULT 0.0000,
        ratesConfigured TINYINT(1) NOT NULL DEFAULT 0,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL
      )
    `);

    const [settings] = await sequelize.query('SELECT id FROM payroll_settings LIMIT 1');
    if (!settings.length) {
      await sequelize.query(`
        INSERT INTO payroll_settings (standardHoursPerDay, overtimeMultiplier, ratesConfigured, createdAt, updatedAt)
        VALUES (8.00, 1.25, 0, NOW(), NOW())
      `);
      console.log('✅ Seeded payroll_settings (contribution rates left at 0)');
    }

    // Divisor for turning a monthly salary into an hourly equivalent for
    // overtime. Conventions differ (22 vs 26 days), so it is configurable
    // rather than baked into the payroll maths.
    if (!(await hasColumn('payroll_settings', 'monthlyWorkingDays'))) {
      await sequelize.query(
        `ALTER TABLE payroll_settings ADD COLUMN monthlyWorkingDays DECIMAL(4,1) NOT NULL DEFAULT 22.0`,
      );
      console.log('✅ Added payroll_settings.monthlyWorkingDays');
    } else {
      console.log('✅ payroll_settings.monthlyWorkingDays already exists');
    }

    // ---------- reservations ----------

    await create('restaurant_tables', `
      CREATE TABLE restaurant_tables (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(32) NOT NULL,
        capacity INT NOT NULL DEFAULT 2,
        area VARCHAR(32) DEFAULT NULL,
        status ENUM('active','inactive') NOT NULL DEFAULT 'active',
        notes VARCHAR(255) DEFAULT NULL,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL
      )
    `);

    await create('reservations', `
      CREATE TABLE reservations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(24) NOT NULL UNIQUE,
        customerUserId INT DEFAULT NULL,
        customerName VARCHAR(128) NOT NULL,
        customerPhone VARCHAR(32) DEFAULT NULL,
        customerEmail VARCHAR(128) DEFAULT NULL,
        partySize INT NOT NULL DEFAULT 2,
        reservationDate DATE NOT NULL,
        startTime TIME NOT NULL,
        durationMinutes INT NOT NULL DEFAULT 90,
        tableId INT DEFAULT NULL,
        status ENUM('pending','confirmed','seated','completed','cancelled','declined','no-show') NOT NULL DEFAULT 'pending',
        source ENUM('online','staff') NOT NULL DEFAULT 'online',
        notes VARCHAR(255) DEFAULT NULL,
        staffMessage VARCHAR(255) DEFAULT NULL,
        createdByUserId INT DEFAULT NULL,
        confirmedByUserId INT DEFAULT NULL,
        confirmedAt DATETIME DEFAULT NULL,
        seatedAt DATETIME DEFAULT NULL,
        closedAt DATETIME DEFAULT NULL,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        INDEX idx_res_date (reservationDate, startTime),
        INDEX idx_res_table (tableId, reservationDate),
        INDEX idx_res_customer (customerUserId)
      )
    `);

    await create('reservation_events', `
      CREATE TABLE reservation_events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        reservationId INT NOT NULL,
        actorUserId INT DEFAULT NULL,
        actorRole VARCHAR(32) DEFAULT NULL,
        event VARCHAR(64) NOT NULL,
        detail TEXT DEFAULT NULL,
        createdAt DATETIME NOT NULL,
        INDEX idx_resevent (reservationId)
      )
    `);

    const [tables] = await sequelize.query('SELECT COUNT(*) n FROM restaurant_tables');
    console.log(`\n📋 Tables configured: ${tables[0].n}`);
    if (Number(tables[0].n) === 0) {
      console.log('   Add your real tables in Admin -> Reservations -> Tables.');
      console.log('   Nothing is seeded: only you know how many tables the restaurant has.');
    }

    const [rates] = await sequelize.query('SELECT ratesConfigured FROM payroll_settings LIMIT 1');
    if (rates.length && !rates[0].ratesConfigured) {
      console.log('\n⚠️  Payroll contribution rates are not set.');
      console.log('   Enter SSS / PhilHealth / Pag-IBIG / tax rates in Admin -> Payroll -> Rates');
      console.log('   before finalizing a period. Payroll will block finalizing until then.');
    }

    console.log('\n✅ Migration complete');
  } catch (error) {
    console.error('Migration error:', error.message);
  } finally {
    await sequelize.close();
  }
}

migrate();
