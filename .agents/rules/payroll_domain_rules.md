---
name: Payroll Domain Rules
description: Quick-reference rules for the Payroll and Attendance module. Full documentation is in docs/payroll/.
---

# Payroll Domain Logic Rules

> **Full Documentation:** See `docs/payroll/` for the complete payroll specification.
> Before implementing any payroll feature, read `docs/payroll/AI_AGENT_RULES.md` first.

## 1. Financial Math Precision
*   All monetary values (grossPay, deductions, netPay) MUST be rounded to exactly 2 decimal places using `Math.round(value * 100) / 100` before DB storage.
*   Never use floating-point arithmetic results directly as final monetary values.
*   Store money as `DECIMAL(10,2)` in MySQL. Never as `FLOAT` or `DOUBLE`.

## 2. Time Conversion
*   Clock times must be converted to **Decimal Hours** before multiplying by rate.
*   8h 30m = `8.5` (correct) | "8:30" in arithmetic = ❌ wrong.
*   Use: `(clockOutMs - clockInMs) / (1000 * 60 * 60)`

## 3. Immutability — Paid Payroll Cannot Be Modified
*   Payroll with status `APPROVED`, `PAID`, or `LOCKED` cannot be auto-recalculated.
*   Attendance edits after `APPROVED` require a controlled reopen workflow.
*   Post-PAID corrections use `PayrollAdjustment` records only.

## 4. Historical Snapshot Rule
*   When a payroll entry is calculated, copy the employee's `hourlyRate`, `name`, and `role` into the entry as snapshot fields.
*   Never query `Employee.hourlyRate` to reconstruct historical payroll. Use snapshot fields.

## 5. Deduction Ordering
1.  Calculate Gross Pay from rate × hours.
2.  Apply percentage-based deductions.
3.  Apply flat deductions.
4.  NetPay = GrossPay − TotalDeductions. Cap NetPay at 0 (never negative).

## 6. Dynamic Payroll Config
*   Business rules (grace period, overtime multiplier, regular hours/day, etc.) are stored in the `PayrollConfigs` table.
*   Never hardcode these values in calculator code. Always load from config.
*   See `docs/payroll/DATABASE_SCHEMA.md` for config table schema.

## 7. Calculations Are Backend-Only
*   The PayrollCalculator runs on the backend only. Frontend displays what the backend returns.
*   All payroll formulas live exclusively in `services/payrollCalculator.js`.
*   See `docs/payroll/PAYROLL_FORMULAS.md` for all formulas.

## 8. Authorization
*   All payroll API endpoints require `verifyToken` + `requireAdmin` middleware.
*   Frontend route hiding is NOT authorization.

## 9. Audit Trail
*   Use `createLog()` from `utils/logger.js` for: salary changes, attendance corrections,
    payroll generation, approval, payment, reopening, and cancellation.

