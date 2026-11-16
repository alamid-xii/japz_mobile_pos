import { sequelize } from './models/db.js';
import * as payrollService from './services/payrollService.js';
import bcrypt from 'bcrypt';

async function seedPayroll() {
  try {
    console.log("Connecting to database...");
    await sequelize.authenticate();

    // Import models properly from index.js
    const { User, Employee, Attendance, PayrollPeriod, PayrollEntry, Payslip } = await import('./models/index.js');
    
    // Ensure all employees exist
    const hashedPassword = await bcrypt.hash('password', 10);
    await Employee.findOrCreate({
      where: { email: 'john@example.com' },
      defaults: {
        name: 'John Doe',
        phone: '1234567890',
        password: hashedPassword,
        role: 'cashier',
        hourlyRate: 85.00,
        status: 'active'
      }
    });

    await Employee.findOrCreate({
      where: { email: 'jane@example.com' },
      defaults: {
        name: 'Jane Smith',
        phone: '0987654321',
        password: hashedPassword,
        role: 'kitchen',
        hourlyRate: 95.00,
        status: 'active'
      }
    });

    const allEmployees = await Employee.findAll({ where: { status: 'active' } });
    console.log(`Found ${allEmployees.length} active employees to seed attendance for.`);

    // Create a 2-week period
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 14);

    const periodStart = startDate.toISOString().split('T')[0];
    const periodEnd = endDate.toISOString().split('T')[0];

    // Seed Attendances for all active employees
    for (let i = 0; i < 14; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      
      // Skip Sundays
      if (currentDate.getDay() === 0) continue;

      const dateStr = currentDate.toISOString().split('T')[0];
      
      // Clock in at 9:00 AM, Clock out at 6:00 PM (8 hrs work, 1 hr lunch)
      const clockIn = new Date(`${dateStr}T09:00:00`);
      const clockOut = new Date(`${dateStr}T18:00:00`);

      for (const emp of allEmployees) {
        await Attendance.findOrCreate({
          where: { employeeId: emp.id, date: dateStr },
          defaults: {
            clockIn,
            clockOut,
            totalHours: 8.00,
            status: 'present'
          }
        });
      }
    }
    console.log("Attendance records seeded for all employees.");

    // Find or create Period 2
    let period = await PayrollPeriod.findOne({ where: { id: 2 } });
    if (!period) {
      period = await PayrollPeriod.create({
        periodStart,
        periodEnd,
        status: 'DRAFT',
        description: 'Bi-weekly Payroll Seed',
        createdBy: 1
      });
    }

    const adminUser = { id: 1, name: 'Admin', role: 'admin' };

    // Reset status to DRAFT so we can cleanly calculate and approve
    period.status = 'DRAFT';
    await period.save();

    // 1. Calculate payroll
    console.log("Calculating payroll entries for period...");
    await payrollService.calculatePayroll(period.id, adminUser);

    // 2. Transition DRAFT/CALCULATED -> UNDER_REVIEW -> APPROVED
    period = await PayrollPeriod.findByPk(period.id);
    period.status = 'UNDER_REVIEW';
    await period.save();

    await payrollService.approvePayroll(period.id, adminUser);
    console.log("Payroll period approved!");

    // 3. Generate Payslips
    const payslips = await payrollService.generatePayslips(period.id, adminUser);
    console.log(`Generated ${payslips.length} payslips for period ${period.id}!`);

    // Verify payslip retrieval for Cashier and Kitchen
    const cashierPayslips = await payrollService.getMyPayslips(2); // user id 2
    console.log(`Cashier payslips retrieved: ${cashierPayslips.length}`);

    const kitchenPayslips = await payrollService.getMyPayslips(3); // user id 3
    console.log(`Kitchen payslips retrieved: ${kitchenPayslips.length}`);

    console.log("Done seeding payroll data.");
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

seedPayroll();
