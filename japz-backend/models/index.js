/*
MIT License

Copyright (c) 2025 Christian I. Cabrera || XianFire Framework
Mindoro State University - Philippines

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
import { User } from './userModel.js';
import { KitchenStation } from './kitchenStationModel.js';
import { MenuCategory } from './menuCategoryModel.js';
import { MenuItem } from './menuItemModel.js';
import { Order } from './orderModel.js';
import { OrderItem } from './orderItemModel.js';
import { Payment } from './paymentModel.js';
import { Log } from './logModel.js';
import { Feedback } from './feedbackModel.js';
import { Discount } from './discountModel.js';
import { Voucher } from './voucherModel.js';
import { BusinessHours } from './businessHoursModel.js';
import { Employee } from './employeeModel.js';
import { Attendance } from './attendanceModel.js';
import { Payroll } from './payrollModel.js'; // Legacy — kept for backward compat

// ── PAYROLL MODULE MODELS ──────────────────────────────────────────────────
import { PayrollConfig } from './payrollConfigModel.js';
import { PayrollPeriod } from './payrollPeriodModel.js';
import { PayrollEntry } from './payrollEntryModel.js';
import { PayrollAdjustment } from './payrollAdjustmentModel.js';
import { Payslip } from './payslipModel.js';

// ── EXISTING ASSOCIATIONS (unchanged) ────────────────────────────────────

MenuCategory.hasMany(MenuItem, { foreignKey: 'categoryId', as: 'menuItems' });
MenuItem.belongsTo(MenuCategory, { foreignKey: 'categoryId', as: 'category' });

Order.belongsTo(User, { foreignKey: 'cashierId', as: 'cashier' });
Order.belongsTo(User, { foreignKey: 'preparedById', as: 'preparedBy' });
User.hasMany(Order, { foreignKey: 'cashierId', as: 'orders' });
User.hasMany(Order, { foreignKey: 'preparedById', as: 'preparedOrders' });

Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'items' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

Order.hasMany(Payment, { foreignKey: 'orderId', as: 'payments' });
Payment.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

OrderItem.belongsTo(MenuItem, { foreignKey: 'menuItemId', as: 'menuItem' });
MenuItem.hasMany(OrderItem, { foreignKey: 'menuItemId', as: 'orderItems' });

// Feedback associations
Feedback.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
Order.hasMany(Feedback, { foreignKey: 'orderId', as: 'feedbacks' });

// Legacy Payroll associations (kept for backward compat)
Employee.hasMany(Attendance, { foreignKey: 'employeeId', as: 'attendances' });
Attendance.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });

Employee.hasMany(Payroll, { foreignKey: 'employeeId', as: 'payrolls' });
Payroll.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });

// ── PAYROLL MODULE ASSOCIATIONS ───────────────────────────────────────────

// PayrollPeriod → PayrollEntry (one period has many employee entries)
PayrollPeriod.hasMany(PayrollEntry, { foreignKey: 'payrollPeriodId', as: 'entries' });
PayrollEntry.belongsTo(PayrollPeriod, { foreignKey: 'payrollPeriodId', as: 'payrollPeriod' });
PayrollEntry.belongsTo(PayrollPeriod, { foreignKey: 'payrollPeriodId', as: 'period' });

// Employee → PayrollEntry (one employee has many entries across periods)
Employee.hasMany(PayrollEntry, { foreignKey: 'employeeId', as: 'payrollEntries' });
PayrollEntry.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });

// PayrollEntry → Payslip (1-to-1)
PayrollEntry.hasOne(Payslip, { foreignKey: 'payrollEntryId', as: 'payslip' });
Payslip.belongsTo(PayrollEntry, { foreignKey: 'payrollEntryId', as: 'payrollEntry' });
Payslip.belongsTo(PayrollEntry, { foreignKey: 'payrollEntryId', as: 'entry' });

// PayrollEntry → PayrollAdjustment (one entry can have many adjustments)
PayrollEntry.hasMany(PayrollAdjustment, { foreignKey: 'payrollEntryId', as: 'adjustments' });
PayrollAdjustment.belongsTo(PayrollEntry, { foreignKey: 'payrollEntryId', as: 'payrollEntry' });
PayrollAdjustment.belongsTo(PayrollEntry, { foreignKey: 'payrollEntryId', as: 'entry' });

// Employee → Payslip (for quick lookup without going through entry)
Employee.hasMany(Payslip, { foreignKey: 'employeeId', as: 'payslips' });
Payslip.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });

// User → PayrollPeriod (created by / approved by)
User.hasMany(PayrollPeriod, { foreignKey: 'createdBy', as: 'createdPeriods' });
PayrollPeriod.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

// User ↔ Employee (link POS user accounts to payroll employee profiles)
Employee.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasOne(Employee, { foreignKey: 'userId', as: 'employee' });

export {
  User, KitchenStation, MenuCategory, MenuItem, Order, OrderItem,
  Payment, Log, Feedback, Discount, Voucher, BusinessHours,
  Employee, Attendance, Payroll,
  // Payroll Module
  PayrollConfig, PayrollPeriod, PayrollEntry, PayrollAdjustment, Payslip
};