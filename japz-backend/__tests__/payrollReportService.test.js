import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generatePeriodCSV, getPayrollAnalytics } from '../services/payrollReportService.js';
import { PayrollPeriod, Order } from '../models/index.js';

vi.mock('../models/index.js', () => ({
  PayrollPeriod: {
    findByPk: vi.fn(),
    findAll: vi.fn(),
  },
  PayrollEntry: {},
  Order: {
    sum: vi.fn(),
  },
}));

describe('PayrollReportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generatePeriodCSV', () => {
    it('throws error when period does not exist', async () => {
      PayrollPeriod.findByPk.mockResolvedValue(null);
      await expect(generatePeriodCSV(999)).rejects.toThrow('Payroll period not found');
    });

    it('generates properly formatted CSV with headers, employee rows, and summary totals', async () => {
      const mockPeriod = {
        id: 1,
        description: 'October 2026 Regular',
        periodStart: '2026-10-01',
        periodEnd: '2026-10-31',
        status: 'PAID',
        entries: [
          {
            employeeId: 101,
            snapshotEmployeeName: 'Maria Santos',
            snapshotRole: 'Cashier',
            snapshotHourlyRate: '75.00',
            regularHours: '160.00',
            basicPay: '12000.00',
            overtimeHours: '10.00',
            overtimePay: '937.50',
            holidayPay: '0.00',
            restDayPay: '0.00',
            allowances: '500.00',
            bonuses: '0.00',
            grossPay: '13437.50',
            lateMinutes: 15,
            lateDeduction: '18.75',
            undertimeMinutes: 0,
            undertimeDeduction: '0.00',
            absenceDays: '0.00',
            absenceDeduction: '0.00',
            cashAdvanceDeduction: '1000.00',
            otherDeductions: '0.00',
            totalDeductions: '1018.75',
            netPay: '12418.75',
            status: 'PAID',
          },
          {
            employeeId: 102,
            snapshotEmployeeName: 'Juan Dela Cruz',
            snapshotRole: 'Cook',
            snapshotHourlyRate: '80.00',
            regularHours: '160.00',
            basicPay: '12800.00',
            overtimeHours: '5.00',
            overtimePay: '500.00',
            holidayPay: '0.00',
            restDayPay: '0.00',
            allowances: '0.00',
            bonuses: '0.00',
            grossPay: '13300.00',
            lateMinutes: 0,
            lateDeduction: '0.00',
            undertimeMinutes: 0,
            undertimeDeduction: '0.00',
            absenceDays: '0.00',
            absenceDeduction: '0.00',
            cashAdvanceDeduction: '0.00',
            otherDeductions: '0.00',
            totalDeductions: '0.00',
            netPay: '13300.00',
            status: 'PAID',
          },
        ],
      };

      PayrollPeriod.findByPk.mockResolvedValue(mockPeriod);

      const result = await generatePeriodCSV(1);
      expect(result).toBeDefined();
      expect(result.filename).toContain('2026-10-01_to_2026-10-31.csv');

      const lines = result.csv.split('\r\n');
      expect(lines.length).toBe(4); // Headers + 2 employees + Total row

      // Headers check
      expect(lines[0]).toContain('"Employee ID"');
      expect(lines[0]).toContain('"Employee Name"');
      expect(lines[0]).toContain('"Net Pay"');

      // Employee 1 check
      expect(lines[1]).toContain('"Maria Santos"');
      expect(lines[1]).toContain('"Cashier"');
      expect(lines[1]).toContain('"12418.75"');

      // Employee 2 check
      expect(lines[2]).toContain('"Juan Dela Cruz"');
      expect(lines[2]).toContain('"Cook"');

      // Summary row check
      expect(lines[3]).toContain('"TOTAL"');
      expect(lines[3]).toContain('"2 Employees"');
      // Sum net pay = 12418.75 + 13300.00 = 25718.75
      expect(lines[3]).toContain('"25718.75"');
    });
  });

  describe('getPayrollAnalytics', () => {
    it('aggregates period summaries and computes labor cost ratio against POS sales', async () => {
      const mockPeriods = [
        {
          id: 1,
          description: 'October 2026',
          periodStart: '2026-10-01',
          periodEnd: '2026-10-31',
          status: 'PAID',
          entries: [
            {
              employeeId: 101,
              snapshotRole: 'Cashier',
              regularHours: '160.00',
              overtimeHours: '10.00',
              basicPay: '12000.00',
              overtimePay: '937.50',
              grossPay: '12937.50',
              totalDeductions: '500.00',
              netPay: '12437.50',
            },
          ],
        },
      ];

      PayrollPeriod.findAll.mockResolvedValue(mockPeriods);
      Order.sum.mockResolvedValue('50000.00'); // POS sales: 50,000

      const analytics = await getPayrollAnalytics({ year: 2026 });
      expect(analytics.periodCount).toBe(1);
      expect(analytics.summary.totalGrossPay).toBe(12937.5);
      expect(analytics.summary.totalNetPay).toBe(12437.5);
      expect(analytics.summary.totalPosSales).toBe(50000);
      // Labor Cost % = (12937.50 / 50000.00) * 100 = 25.875% -> 25.87
      expect(analytics.summary.laborCostPercentage).toBe(25.87);

      expect(analytics.roleBreakdown.length).toBe(1);
      expect(analytics.roleBreakdown[0].role).toBe('Cashier');
      expect(analytics.roleBreakdown[0].sharePercentage).toBe(100);
    });
  });
});
