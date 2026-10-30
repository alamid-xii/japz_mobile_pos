# PAYROLL_RULES.md — Payroll Business Rules

> **Status:** Foundation Documentation
> **Last Updated:** 2026-10-06
> **Related Documents:** [PAYROLL_FORMULAS.md](./PAYROLL_FORMULAS.md), [ATTENDANCE_RULES.md](./ATTENDANCE_RULES.md)

---

## 1. Employee Compensation

### 1.1 Supported Compensation Types

| Type | Status | Notes |
|---|---|---|
| **Hourly Rate** | ✅ Currently Implemented | `Employee.hourlyRate` field (DECIMAL 10,2). This is the current primary type. |
| **Daily Rate** | 🚧 Not Yet Implemented | TBD — may be derived from hourly rate × regular hours per day. |
| **Monthly Salary** | 🚧 Not Yet Implemented | TBD — future enhancement. |

> For the initial payroll implementation, **hourly rate is the only supported compensation type**.

### 1.2 Core Compensation Fields

| Field | Source | Notes |
|---|---|---|
| Basic Rate | `Employee.hourlyRate` | Stored in DB as DECIMAL(10,2). |
| Pay Frequency | **Monthly** | Employees are paid once per month. Cutoff is the last day of the month. |
| Cutoff Dates | Last day of each month | E.g., October 1–31, November 1–30. |
| Pay Date | **TBD** | The date on which net pay is released to employees. |
| Regular Working Hours | **Dynamic (Config)** | Default: 8 hours/day. Stored in `PayrollConfigs` table. Editable by admin. |
| Working Days | **Dynamic (Config)** | Default: Mon–Sat. Stored in `PayrollConfigs` table. Editable by admin. |
| Rest Days | **Dynamic (Config)** | Default: Sunday. Stored in `PayrollConfigs` table. Editable by admin. |
| Break Periods | **Dynamic (Config)** | Default: 1 hour unpaid. Stored in `PayrollConfigs` table. Editable by admin. |
| Grace Period | **Dynamic (Config)** | Default: 5 minutes. Stored in `PayrollConfigs` table. Editable by admin. |
| Overtime Multiplier | **Dynamic (Config)** | Default: 1.25×. Stored in `PayrollConfigs` table. Editable by admin. |

> **All configurable values are stored in the `PayrollConfigs` table (see `DATABASE_SCHEMA.md`).**
> Admin can update these settings through the Payroll Settings page without redeploying code.

---

## 2. Earnings

### 2.1 Basic Pay
The foundational earning calculated from the employee's rate and hours worked during the regular shift window.
- Formula: See [PAYROLL_FORMULAS.md → Basic Pay](./PAYROLL_FORMULAS.md).
- Stored in: `payroll_entries.basic_pay`.

### 2.2 Regular Pay
The total pay for all regular (non-overtime, non-holiday) hours worked.
- Same as Basic Pay for hourly-rate employees with no complexity.

### 2.3 Overtime Pay
Compensation for hours worked beyond the regular shift.
- **Overtime Multiplier:** TBD (e.g., 1.25× for standard overtime).
- **Overtime Approval:** TBD — whether overtime requires prior approval or is automatically calculated from attendance.
- Formula: See [PAYROLL_FORMULAS.md → Overtime Pay](./PAYROLL_FORMULAS.md).
- Stored in: `payroll_entries.overtime_pay`.

### 2.4 Allowances
Fixed or variable additions to pay (e.g., transportation, meal allowance).
- **Types and amounts:** TBD.
- Stored in: `payroll_entries.allowances`.

### 2.5 Bonuses
One-time or periodic performance-based additions.
- **Rules:** TBD.
- Stored in: `payroll_entries.bonuses`.

### 2.6 Holiday Pay
Additional compensation for working on a declared holiday.
- **Holiday multiplier:** TBD.
- **Holiday list:** TBD.
- Stored in: `payroll_entries.holiday_pay`.

### 2.7 Rest Day Pay
Additional compensation for working on a designated rest day.
- **Rest day multiplier:** TBD.
- Stored in: `payroll_entries.rest_day_pay`.

---

## 3. Deductions

### 3.1 Late Deduction
Deduction applied when an employee clocks in after the designated shift start (plus any grace period).
- **Grace Period:** TBD (e.g., 5 minutes).
- Formula: See [PAYROLL_FORMULAS.md → Late Deduction](./PAYROLL_FORMULAS.md).
- Stored in: `payroll_entries.late_deduction`.

### 3.2 Undertime Deduction
Deduction applied when an employee clocks out before the designated shift end.
- Formula: See [PAYROLL_FORMULAS.md → Undertime Deduction](./PAYROLL_FORMULAS.md).
- Stored in: `payroll_entries.undertime_deduction`.

### 3.3 Absence Deduction
Deduction applied for days an employee has no attendance record and no approved leave.
- Formula: See [PAYROLL_FORMULAS.md → Absence Deduction](./PAYROLL_FORMULAS.md).
- Stored in: `payroll_entries.absence_deduction`.

### 3.4 Unpaid Leave Deduction
Deduction applied for approved unpaid leave.
- **Leave types:** TBD.
- Stored within `payroll_entries.absence_deduction` or as a separate field: TBD.

### 3.5 Cash Advance Deduction
Deduction for any salary advance given to the employee during the period.
- **Cash advance tracking:** TBD — may require a separate `cash_advances` table.
- Stored in: `payroll_entries.cash_advance_deduction`.

### 3.6 Government / Statutory Deductions
Philippine government-mandated deductions (SSS, PhilHealth, Pag-IBIG, Withholding Tax).
- **Exact contribution tables and percentages:** TBD.
- These must not be hardcoded. When implemented, they must be sourced from configurable tables or a config service.
- Stored in: Separate fields per type (e.g., `sss_deduction`, `philhealth_deduction`, `pagibig_deduction`, `tax_deduction`): TBD.

---

## 4. Payroll Integrity Rules

### I-01: Approved Payroll Cannot Automatically Recalculate
Once a payroll entry reaches status `APPROVED`, `PAID`, or `LOCKED`, it may not be automatically recalculated. Any recalculation requires explicit admin action through a controlled reopen workflow.

### I-02: Paid Payroll Cannot Automatically Recalculate
A payroll entry with status `PAID` or `LOCKED` is immutable. Its financial values are permanent records.

### I-03: Rate Changes Affect Future Periods Only
If an employee's `hourlyRate` is changed, that change must only apply to payroll periods opened **after** the date of change. All existing and historical payroll entries retain the rate that was snapshotted at calculation time.

### I-04: Historical Payroll Stores the Rate at Time of Calculation
When a Payroll Entry is generated, the employee's current `hourlyRate` (and other relevant data) must be copied into the Payroll Entry record itself. The entry must never re-query the live `Employee` table to reconstruct historical financials.

### I-05: Attendance Edits After Finalization Require a Process
If an attendance record is corrected after a payroll entry has been calculated, that entry must not silently update. Options:
- If entry is `DRAFT` or `CALCULATED`: allow recalculation.
- If entry is `APPROVED` or later: require admin to reopen the entry first.
- If entry is `PAID` or `LOCKED`: require an **adjustment entry** instead.

### I-06: Manual Adjustments Require an Audit Trail
Any manual adjustment to a payroll entry must record: the `userId` who made it, the timestamp, the reason, and the old and new values, written to the `Logs` table.
