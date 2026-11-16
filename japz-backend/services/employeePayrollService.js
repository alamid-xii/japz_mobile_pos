/**
 * EmployeePayrollService — Manages employee profiles, per-employee pay configurations,
 * and synchronization between POS Users and Payroll Employees.
 */
import { Op } from 'sequelize';
import { Employee, User, Attendance } from '../models/index.js';
import { createLog, getClientIp } from '../utils/logger.js';
import { getPayrollConfig } from './payrollConfigService.js';

/**
 * Get all employees with their pay config, user linkage, and attendance summaries.
 */
export const getAllEmployees = async () => {
  const employees = await Employee.findAll({
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'role', 'status'],
        required: false
      }
    ],
    order: [
      ['status', 'ASC'], // 'active' before 'inactive'
      ['name', 'ASC']
    ]
  });

  // Calculate shift statistics for each employee in the current month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  const result = await Promise.all(
    employees.map(async (emp) => {
      const monthShifts = await Attendance.count({
        where: {
          employeeId: emp.id,
          date: { [Op.between]: [startOfMonth, endOfMonth] }
        }
      });

      const lastShift = await Attendance.findOne({
        where: { employeeId: emp.id },
        order: [['date', 'DESC']],
        attributes: ['date', 'clockIn', 'clockOut']
      });

      return {
        id: emp.id,
        name: emp.name,
        email: emp.email,
        phone: emp.phone,
        role: emp.role,
        status: emp.status,
        joinDate: emp.joinDate,
        hourlyRate: parseFloat(emp.hourlyRate) || 0,
        dailyAllowance: parseFloat(emp.dailyAllowance) || 0,
        monthlyAllowance: parseFloat(emp.monthlyAllowance) || 0,
        overtimeAllowed: emp.overtimeAllowed !== false,
        sssExempt: !!emp.sssExempt,
        philhealthExempt: !!emp.philhealthExempt,
        pagibigExempt: !!emp.pagibigExempt,
        taxExempt: !!emp.taxExempt,
        customDeduction: parseFloat(emp.customDeduction) || 0,
        userId: emp.userId,
        linkedUser: emp.user || null,
        monthShifts,
        lastShiftDate: lastShift?.date || null
      };
    })
  );

  return result;
};

/**
 * Get count of active employees.
 */
export const getActiveEmployeeCount = async () => {
  return await Employee.count({ where: { status: 'active' } });
};

/**
 * Update an employee's individual pay configuration.
 */
export const updateEmployeePayConfig = async (employeeId, configData, adminUser, req = null) => {
  const employee = await Employee.findByPk(employeeId);
  if (!employee) throw new Error('Employee not found');

  const before = {
    hourlyRate: employee.hourlyRate,
    dailyAllowance: employee.dailyAllowance,
    monthlyAllowance: employee.monthlyAllowance,
    overtimeAllowed: employee.overtimeAllowed,
    sssExempt: employee.sssExempt,
    philhealthExempt: employee.philhealthExempt,
    pagibigExempt: employee.pagibigExempt,
    taxExempt: employee.taxExempt,
    customDeduction: employee.customDeduction,
    status: employee.status
  };

  if (configData.hourlyRate !== undefined) {
    const rate = parseFloat(configData.hourlyRate);
    if (isNaN(rate) || rate < 0) throw new Error('Hourly rate must be a valid non-negative number');
    employee.hourlyRate = rate;
  }

  if (configData.dailyAllowance !== undefined) {
    const val = parseFloat(configData.dailyAllowance);
    if (isNaN(val) || val < 0) throw new Error('Daily allowance must be non-negative');
    employee.dailyAllowance = val;
  }

  if (configData.monthlyAllowance !== undefined) {
    const val = parseFloat(configData.monthlyAllowance);
    if (isNaN(val) || val < 0) throw new Error('Monthly allowance must be non-negative');
    employee.monthlyAllowance = val;
  }

  if (configData.customDeduction !== undefined) {
    const val = parseFloat(configData.customDeduction);
    if (isNaN(val) || val < 0) throw new Error('Custom deduction must be non-negative');
    employee.customDeduction = val;
  }

  if (configData.overtimeAllowed !== undefined) {
    employee.overtimeAllowed = Boolean(configData.overtimeAllowed);
  }

  if (configData.sssExempt !== undefined) employee.sssExempt = Boolean(configData.sssExempt);
  if (configData.philhealthExempt !== undefined) employee.philhealthExempt = Boolean(configData.philhealthExempt);
  if (configData.pagibigExempt !== undefined) employee.pagibigExempt = Boolean(configData.pagibigExempt);
  if (configData.taxExempt !== undefined) employee.taxExempt = Boolean(configData.taxExempt);
  if (configData.status !== undefined && ['active', 'inactive'].includes(configData.status)) {
    employee.status = configData.status;
  }

  await employee.save();

  // If linked to a User, also sync hourlyRate back to User if changed
  if (employee.userId && configData.hourlyRate !== undefined) {
    try {
      const user = await User.findByPk(employee.userId);
      if (user) {
        user.hourlyRate = employee.hourlyRate;
        await user.save();
      }
    } catch (err) {
      console.warn('Syncing hourlyRate to User warning:', err.message);
    }
  }

  await createLog({
    action: 'OTHER',
    module: 'payroll',
    userId: adminUser.id,
    userName: adminUser.name,
    entityId: employee.id,
    entityType: 'Employee',
    description: `Updated pay config for ${employee.name} (Rate: ₱${employee.hourlyRate}/hr)`,
    changes: { before, after: {
      hourlyRate: employee.hourlyRate,
      dailyAllowance: employee.dailyAllowance,
      monthlyAllowance: employee.monthlyAllowance,
      overtimeAllowed: employee.overtimeAllowed,
      sssExempt: employee.sssExempt,
      philhealthExempt: employee.philhealthExempt,
      pagibigExempt: employee.pagibigExempt,
      taxExempt: employee.taxExempt,
      customDeduction: employee.customDeduction,
      status: employee.status
    }},
    ipAddress: req ? getClientIp(req) : null,
    status: 'success'
  });

  return employee;
};

/**
 * Synchronize approved POS Users into Employee table.
 * Any approved Cashier or Kitchen staff who does not have an Employee record will be created.
 * Existing links will be updated with latest name and status.
 */
export const syncEmployeesFromUsers = async (adminUser, req = null) => {
  const config = await getPayrollConfig();
  const defaultRate = parseFloat(config.defaultHourlyRate) || 75.00;

  const staffUsers = await User.findAll({
    where: {
      role: { [Op.in]: ['admin', 'cashier', 'kitchen', 'rider', 'inventory'] },
      status: { [Op.in]: ['approved', 'inactive'] }
    }
  });

  let createdCount = 0;
  let updatedCount = 0;

  for (const user of staffUsers) {
    // Check by userId or email
    let employee = await Employee.findOne({
      where: {
        [Op.or]: [
          { userId: user.id },
          { email: user.email }
        ]
      }
    });

    const isStaffActive = user.status === 'approved';
    const roleForEmployee = user.role;

    if (!employee) {
      // Create new Employee record
      employee = await Employee.create({
        name: user.name,
        email: user.email,
        phone: '',
        password: user.password,
        role: roleForEmployee,
        status: isStaffActive ? 'active' : 'inactive',
        hourlyRate: parseFloat(user.hourlyRate) || defaultRate,
        userId: user.id
      });
      createdCount++;
    } else {
      // Update existing record
      let changed = false;
      if (!employee.userId) { employee.userId = user.id; changed = true; }
      if (employee.name !== user.name) { employee.name = user.name; changed = true; }
      if (employee.role !== roleForEmployee && user.role !== 'admin') { employee.role = roleForEmployee; changed = true; }
      const newStatus = isStaffActive ? 'active' : 'inactive';
      if (employee.status !== newStatus) { employee.status = newStatus; changed = true; }
      if ((!employee.hourlyRate || parseFloat(employee.hourlyRate) === 0) && user.hourlyRate) {
        employee.hourlyRate = user.hourlyRate;
        changed = true;
      }
      if (changed) {
        await employee.save();
        updatedCount++;
      }
    }
  }

  await createLog({
    action: 'OTHER',
    module: 'payroll',
    userId: adminUser.id,
    userName: adminUser.name,
    entityId: adminUser.id,
    entityType: 'User',
    description: `Synced POS staff to payroll: ${createdCount} created, ${updatedCount} updated`,
    changes: { createdCount, updatedCount, totalUsersChecked: staffUsers.length },
    ipAddress: req ? getClientIp(req) : null,
    status: 'success'
  });

  const allEmployees = await getAllEmployees();
  return {
    createdCount,
    updatedCount,
    totalEmployees: allEmployees.length,
    employees: allEmployees
  };
};
