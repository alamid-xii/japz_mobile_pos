# TESTING_PLAN.md — Payroll Testing Strategy

> **Status:** Foundation Documentation
> **Last Updated:** 2026-10-06
> **Related Documents:** [PAYROLL_FORMULAS.md](./PAYROLL_FORMULAS.md), [DEFINITION_OF_DONE.md](./DEFINITION_OF_DONE.md)

---

## 1. Testing Philosophy

The payroll module deals with money. Bugs in payroll calculations directly harm employees. Therefore:

- **The `PayrollCalculator` must be tested before any UI is built.**
- Every formula in [PAYROLL_FORMULAS.md](./PAYROLL_FORMULAS.md) must have at least one corresponding test.
- Every bug discovered in payroll must receive a regression test before or alongside the fix.
- Tests must use explicit numeric inputs and expected outputs — never approximate comparisons for monetary values.

---

## 2. Recommended Test Framework

The existing project has no test framework installed. For a Node.js ES Module project like this one, recommend:

- **Unit Tests:** [Vitest](https://vitest.dev/) — compatible with ES Modules, fast, zero-config.
- **Integration Tests:** Vitest with a test database (separate from development DB).

Setup (when ready to implement):
```bash
cd japz-backend
npm install --save-dev vitest
```

---

## 3. Unit Tests — PayrollCalculator

All tests target `services/payrollCalculator.js` in complete isolation. No database. No mocking required.

### Setup: Standard Test Fixtures
```javascript
const baseEmployee = { name: 'Test Employee', role: 'cashier', hourlyRate: 100.00 };
const basePeriod = { periodStart: '2026-10-01', periodEnd: '2026-10-15' };
const baseRules = { regularHoursPerDay: 8, overtimeMultiplier: 1.25, gracePeriodMinutes: 5 };
```

### Test Cases

| Test ID | Description | Key Inputs | Expected Output |
|---|---|---|---|
| UT-01 | Basic pay — regular hours only | 80 regular hours, rate 100 | basicPay = 8000.00 |
| UT-02 | Zero hours worked | 0 totalHours | basicPay = 0, netPay = 0 |
| UT-03 | Overtime pay | 10 regular + 2 overtime hours, rate 100, mult 1.25 | overtimePay = 250.00 |
| UT-04 | Late deduction | 30 lateMinutes, rate 100 | lateDeduction = 50.00 (100/60×30) |
| UT-05 | Undertime deduction | 60 undertimeMinutes, rate 100 | undertimeDeduction = 100.00 |
| UT-06 | Absence deduction | 1 absent day, rate 100, 8hr/day | absenceDeduction = 800.00 |
| UT-07 | Multiple deductions | late + undertime + absence | totalDeductions = sum of all |
| UT-08 | Zero deductions | Perfect attendance, no late | totalDeductions = 0 |
| UT-09 | Gross pay calculation | basicPay + overtime + allowances | grossPay = sum of earnings |
| UT-10 | Net pay calculation | grossPay - totalDeductions | netPay = correct value |
| UT-11 | Negative net pay capped at 0 | Very large deductions | netPay = 0, not negative |
| UT-12 | Rounding — float arithmetic | Rate that produces repeating decimal | roundMoney() applied, 2dp result |
| UT-13 | Multiple attendance days summed | 5 days of attendance | correct sum of hours |
| UT-14 | Late within grace period | Clock-in 3 min late, grace 5 min | lateMinutes = 0, lateDeduction = 0 |
| UT-15 | Late beyond grace period | Clock-in 10 min late, grace 5 min | lateMinutes = 10 (or 5, per exact rule TBD) |
| UT-16 | Allowance included in gross | allowances = 500 | grossPay includes 500 |
| UT-17 | Bonus included in gross | bonus = 1000 | grossPay includes 1000 |
| UT-18 | Hourly rate snapshot used | Snapshot rate 100 (live rate changed to 150) | Calculation uses 100, not 150 |
| UT-19 | Decimal hours conversion | 8h 30m attendance | totalHours = 8.5, not 8.3 |
| UT-20 | Absence on rest day = no deduction | Absent on Sunday (rest day) | absenceDays unchanged (TBD) |

---

## 4. Feature / Integration Tests

These tests interact with the database and test the full service layer.

| Test ID | Description | Verified Behavior |
|---|---|---|
| FT-01 | Create payroll period | Period created in DB with status DRAFT |
| FT-02 | Prevent duplicate payroll period | Same date range rejected with error |
| FT-03 | Calculate payroll — happy path | All active employees get entries; status → CALCULATED |
| FT-04 | Calculate payroll — only active employees | Inactive employees excluded |
| FT-05 | Authorization — non-admin blocked | 403 response on all payroll endpoints |
| FT-06 | Approve payroll | Status transitions from UNDER_REVIEW to APPROVED |
| FT-07 | Block transition PAID → DRAFT | Returns 403/400 error |
| FT-08 | Lock payroll | Status transitions to LOCKED |
| FT-09 | Generate payslip | Payslip record created; linked to PayrollEntry |
| FT-10 | Historical salary snapshot | Change employee rate; old payroll entry unchanged |
| FT-11 | Reopen payroll (APPROVED → UNDER_REVIEW) | Logs created; payslips marked superseded |
| FT-12 | Attendance integration | Clock in/out data used in calculation |
| FT-13 | Manual adjustment creation | Adjustment record created; original entry unchanged |
| FT-14 | Block attendance edit on PAID payroll | 400 error returned |
| FT-15 | Generate payroll — transaction rollback on error | No partial data left in DB on failure |

---

## 5. Regression Tests

Every bug found in payroll must be converted to a test before or alongside the fix.

**Format:**
```javascript
// REGRESSION: Bug description — date found
// Bug: [describe what went wrong]
// Fix: [describe what was fixed]
test('regression: [bug description]', () => {
  const result = calculatePayrollEntry(bugInputs, ...);
  expect(result.netPay).toBe(expectedValue);
});
```

---

## 6. Golden Payroll Scenarios

These are complete, end-to-end test inputs with known expected outputs. Use these as reference during implementation.

### Scenario A — Simple Hourly Employee, Perfect Attendance
```
Assumptions:
  - Hourly Rate: ₱100.00
  - Regular Hours/Day: 8
  - Pay Period: 10 working days (80 regular hours total)
  - No overtime, no late, no absence, no allowances

Expected:
  regularHours    = 80.00
  basicPay        = 8,000.00
  overtimePay     = 0.00
  allowances      = 0.00
  grossPay        = 8,000.00
  lateDeduction   = 0.00
  totalDeductions = 0.00
  netPay          = 8,000.00
```

### Scenario B — Employee with Late and Absence
```
Assumptions:
  - Hourly Rate: ₱80.00
  - Regular Hours/Day: 8
  - Pay Period: 10 working days
  - Worked 9 days (72 regular hours)
  - 1 absent day
  - Total late minutes: 45
  - Grace period: 5 minutes (so 45 min late is deducted)

Expected:
  regularHours       = 72.00
  basicPay           = 72 × 80 = 5,760.00
  absenceDeduction   = 1 × (80 × 8) = 640.00
  lateDeduction      = (80/60) × 45 = 60.00
  grossPay           = 5,760.00
  totalDeductions    = 700.00
  netPay             = 5,060.00
```

> **Note:** These scenarios use assumed TBD values for illustration. Once TBD items are resolved, update the numbers accordingly and lock them as canonical test fixtures.
