/**
 * PayrollReportService — Analytics, labor cost ratios, and export generation.
 *
 * Provides:
 *   - Aggregated labor analytics across payroll periods
 *   - Labor Cost % calculation against POS completed sales
 *   - Role / Department payroll breakdown
 *   - Period-over-period historical trends
 *   - CSV export generation for periods and entries
 */
import { Op } from 'sequelize';
import { PayrollPeriod, PayrollEntry, Order } from '../models/index.js';
import { roundMoney } from './payrollCalculator.js';

/**
 * Get comprehensive analytics for a specific period or an entire year.
 *
 * @param {Object} options
 * @param {number} [options.periodId]
 * @param {number} [options.year]
 * @returns {Promise<Object>}
 */
export const getPayrollAnalytics = async ({ periodId, year } = {}) => {
  const currentYear = year || new Date().getFullYear();
  const periodWhere = {};

  if (periodId) {
    periodWhere.id = periodId;
  } else {
    periodWhere.periodStart = {
      [Op.gte]: `${currentYear}-01-01`,
      [Op.lte]: `${currentYear}-12-31 23:59:59`,
    };
    periodWhere.status = { [Op.ne]: 'CANCELLED' };
  }

  const periods = await PayrollPeriod.findAll({
    where: periodWhere,
    include: [{ model: PayrollEntry, as: 'entries' }],
    order: [['periodStart', 'ASC']],
  });

  let totalGrossPay = 0;
  let totalNetPay = 0;
  let totalBasicPay = 0;
  let totalOvertimePay = 0;
  let totalDeductions = 0;
  let totalRegularHours = 0;
  let totalOvertimeHours = 0;
  let totalSalesAllPeriods = 0;

  const roleMap = {};
  const periodTrends = [];

  for (const period of periods) {
    const entries = period.entries || [];

    let pGross = 0;
    let pNet = 0;
    let pOT = 0;
    let pRegHours = 0;
    let pOTHours = 0;
    let pDeductions = 0;

    for (const e of entries) {
      const gross = parseFloat(e.grossPay || 0);
      const net = parseFloat(e.netPay || 0);
      const ot = parseFloat(e.overtimePay || 0);
      const basic = parseFloat(e.basicPay || 0);
      const ded = parseFloat(e.totalDeductions || 0);
      const regH = parseFloat(e.regularHours || 0);
      const otH = parseFloat(e.overtimeHours || 0);

      pGross += gross;
      pNet += net;
      pOT += ot;
      pRegHours += regH;
      pOTHours += otH;
      pDeductions += ded;

      totalGrossPay += gross;
      totalNetPay += net;
      totalBasicPay += basic;
      totalOvertimePay += ot;
      totalDeductions += ded;
      totalRegularHours += regH;
      totalOvertimeHours += otH;

      // Group by role
      const role = e.snapshotRole || 'General Staff';
      if (!roleMap[role]) {
        roleMap[role] = {
          role,
          headcount: 0,
          regularHours: 0,
          overtimeHours: 0,
          grossPay: 0,
          netPay: 0,
          employeeIds: new Set(),
        };
      }
      roleMap[role].employeeIds.add(e.employeeId);
      roleMap[role].regularHours += regH;
      roleMap[role].overtimeHours += otH;
      roleMap[role].grossPay += gross;
      roleMap[role].netPay += net;
    }

    // Query POS completed sales within the period date window
    const startWindow = new Date(`${period.periodStart}T00:00:00`);
    const endWindow = new Date(`${period.periodEnd}T23:59:59.999`);

    let pSales = 0;
    try {
      const salesSum = await Order.sum('total', {
        where: {
          status: { [Op.in]: ['completed', 'paid', 'ready'] },
          createdAt: {
            [Op.between]: [startWindow, endWindow],
          },
        },
      });
      pSales = parseFloat(salesSum || 0);
    } catch {
      pSales = 0;
    }

    totalSalesAllPeriods += pSales;

    const pLaborCostPct = pSales > 0
      ? roundMoney((pGross / pSales) * 100)
      : 0;

    periodTrends.push({
      periodId: period.id,
      description: period.description,
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      status: period.status,
      employeeCount: entries.length,
      grossPay: roundMoney(pGross),
      netPay: roundMoney(pNet),
      overtimePay: roundMoney(pOT),
      regularHours: roundMoney(pRegHours),
      overtimeHours: roundMoney(pOTHours),
      deductions: roundMoney(pDeductions),
      posSales: roundMoney(pSales),
      laborCostPercentage: pLaborCostPct,
    });
  }

  // Format role breakdown
  const roleBreakdown = Object.values(roleMap).map((r) => {
    const gross = roundMoney(r.grossPay);
    const pct = totalGrossPay > 0 ? roundMoney((gross / totalGrossPay) * 100) : 0;
    return {
      role: r.role,
      headcount: r.employeeIds.size,
      regularHours: roundMoney(r.regularHours),
      overtimeHours: roundMoney(r.overtimeHours),
      grossPay: gross,
      netPay: roundMoney(r.netPay),
      sharePercentage: pct,
    };
  }).sort((a, b) => b.grossPay - a.grossPay);

  const overallLaborCostPercentage = totalSalesAllPeriods > 0
    ? roundMoney((totalGrossPay / totalSalesAllPeriods) * 100)
    : 0;

  return {
    year: currentYear,
    periodCount: periods.length,
    summary: {
      totalGrossPay: roundMoney(totalGrossPay),
      totalNetPay: roundMoney(totalNetPay),
      totalBasicPay: roundMoney(totalBasicPay),
      totalOvertimePay: roundMoney(totalOvertimePay),
      totalDeductions: roundMoney(totalDeductions),
      totalRegularHours: roundMoney(totalRegularHours),
      totalOvertimeHours: roundMoney(totalOvertimeHours),
      totalPosSales: roundMoney(totalSalesAllPeriods),
      laborCostPercentage: overallLaborCostPercentage,
    },
    roleBreakdown,
    periodTrends,
  };
};

/**
 * Generate CSV export content for a specific payroll period.
 *
 * @param {number} periodId
 * @returns {Promise<{ filename: string, csv: string }>}
 */
export const generatePeriodCSV = async (periodId) => {
  const period = await PayrollPeriod.findByPk(periodId, {
    include: [{ model: PayrollEntry, as: 'entries' }],
  });

  if (!period) throw new Error('Payroll period not found');

  const headers = [
    'Employee ID',
    'Employee Name',
    'Role',
    'Hourly Rate (PHP)',
    'Regular Hours',
    'Basic Pay',
    'OT Hours',
    'OT Pay',
    'Holiday Pay',
    'Rest Day Pay',
    'Allowances',
    'Bonuses',
    'Gross Pay',
    'Late (mins)',
    'Late Deduction',
    'Undertime (mins)',
    'Undertime Deduction',
    'Absent Days',
    'Absence Deduction',
    'Cash Advance',
    'Other Deductions',
    'Total Deductions',
    'Net Pay',
    'Status',
  ];

  const escapeCSV = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = [];
  rows.push(headers.map(escapeCSV).join(','));

  let sumGross = 0;
  let sumNet = 0;
  let sumDeductions = 0;
  let sumRegHours = 0;
  let sumOTHours = 0;

  const entries = period.entries || [];
  for (const e of entries) {
    const gross = parseFloat(e.grossPay || 0);
    const net = parseFloat(e.netPay || 0);
    const ded = parseFloat(e.totalDeductions || 0);
    const regH = parseFloat(e.regularHours || 0);
    const otH = parseFloat(e.overtimeHours || 0);

    sumGross += gross;
    sumNet += net;
    sumDeductions += ded;
    sumRegHours += regH;
    sumOTHours += otH;

    const row = [
      e.employeeId,
      e.snapshotEmployeeName || '',
      e.snapshotRole || '',
      parseFloat(e.snapshotHourlyRate || 0).toFixed(2),
      regH.toFixed(2),
      parseFloat(e.basicPay || 0).toFixed(2),
      otH.toFixed(2),
      parseFloat(e.overtimePay || 0).toFixed(2),
      parseFloat(e.holidayPay || 0).toFixed(2),
      parseFloat(e.restDayPay || 0).toFixed(2),
      parseFloat(e.allowances || 0).toFixed(2),
      parseFloat(e.bonuses || 0).toFixed(2),
      gross.toFixed(2),
      e.lateMinutes || 0,
      parseFloat(e.lateDeduction || 0).toFixed(2),
      e.undertimeMinutes || 0,
      parseFloat(e.undertimeDeduction || 0).toFixed(2),
      parseFloat(e.absenceDays || 0).toFixed(2),
      parseFloat(e.absenceDeduction || 0).toFixed(2),
      parseFloat(e.cashAdvanceDeduction || 0).toFixed(2),
      parseFloat(e.otherDeductions || 0).toFixed(2),
      ded.toFixed(2),
      net.toFixed(2),
      e.status || period.status,
    ];

    rows.push(row.map(escapeCSV).join(','));
  }

  // Summary row
  const summaryRow = [
    'TOTAL',
    `${entries.length} Employees`,
    '',
    '',
    sumRegHours.toFixed(2),
    '',
    sumOTHours.toFixed(2),
    '',
    '',
    '',
    '',
    '',
    sumGross.toFixed(2),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    sumDeductions.toFixed(2),
    sumNet.toFixed(2),
    period.status,
  ];
  rows.push(summaryRow.map(escapeCSV).join(','));

  const sanitizedDesc = (period.description || `period_${period.id}`).replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `payroll_${sanitizedDesc}_${period.periodStart}_to_${period.periodEnd}.csv`;

  return {
    filename,
    csv: rows.join('\r\n'),
  };
};
