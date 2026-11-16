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
      );

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
      );
