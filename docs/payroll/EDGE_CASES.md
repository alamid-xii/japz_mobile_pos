# EDGE_CASES.md — Payroll Edge Case Checklist

> **Status:** Foundation Documentation
> **Last Updated:** 2026-10-06
> **Related Documents:** [PAYROLL_WORKFLOW.md](./PAYROLL_WORKFLOW.md), [ATTENDANCE_RULES.md](./ATTENDANCE_RULES.md)

Legend:
- ✅ **Allowed** — System handles automatically.
- 🚫 **Blocked** — System must prevent this.
- 🔍 **Manual Review** — System flags it; human must decide.
- 📋 **Adjustment** — Handled via a post-paid adjustment entry.
- ❓ **TBD** — Not yet decided.

---

## Employee-Level Edge Cases

| # | Scenario | Classification | Notes |
|---|---|---|---|
| EC-01 | Employee hired in the middle of a pay period | ✅ Allowed | Calculate from `joinDate` within the period. Prorate if needed: TBD. |
| EC-02 | Employee resigns in the middle of a pay period | ✅ Allowed | Calculate up to last working day. Status `inactive` prevents future periods. |
| EC-03 | Employee's hourly rate changes mid-period | 🔍 Manual Review | Must not silently change past payroll. Rate change applies to next period. Existing DRAFT entries should use old rate if period overlaps. |
| EC-04 | Employee changes position mid-period | 🔍 Manual Review | Log the change. Use the rate at calculation time (snapshot). |
| EC-05 | Employee changes department mid-period | ✅ Allowed | Snapshot captures state at calculation time. |
| EC-06 | Deactivated employee with historical payroll | ✅ Allowed | Historical records are preserved. Inactive employees are excluded from future payroll runs only. |
| EC-07 | Employee explicitly excluded from a payroll run | ✅ Allowed | Admin must be able to mark an employee as excluded for a specific period with a reason. |

---

## Attendance Edge Cases

| # | Scenario | Classification | Notes |
|---|---|---|---|
| EC-08 | Missing clock-in (only clock-out exists) | 🔍 Manual Review | Flag before payroll generation. Admin must correct before payroll can be approved. |
| EC-09 | Missing clock-out (only clock-in exists) | 🔍 Manual Review | Most common case. Flag for admin correction. |
| EC-10 | Multiple clock-ins on the same day for one employee | 🚫 Blocked | System must prevent this at clock-in time. If exists in DB, flag as data error before payroll. |
| EC-11 | Duplicate attendance record (same employee, same date) | 🚫 Blocked | Must be prevented by unique constraint on `(employeeId, date)`. |
| EC-12 | Overnight shift crossing midnight | 🔍 Manual Review | TIME type is insufficient. Requires DATETIME. Document in TECH_DEBT.md. Until fixed, flag for manual review. |
| EC-13 | Employee has zero attendance for the entire period | ✅ Allowed | All days counted as absent. Net pay = max(0, grossPay - absenceDeduction). If result is 0, payslip shows 0. |
| EC-14 | Employee works overtime without approval | ❓ TBD | Depends on overtime approval policy. |
| EC-15 | Attendance corrected after payroll is DRAFT/CALCULATED | ✅ Allowed | Recalculate when ready. |
| EC-16 | Attendance corrected after payroll is APPROVED | 🔍 Manual Review | Admin must reopen payroll first. Correction triggers recalculation after reopen. |
| EC-17 | Attendance corrected after payroll is PAID | 📋 Adjustment | Cannot edit. Admin creates a PayrollAdjustment for the next period or off-cycle. |
| EC-18 | Attendance corrected after payroll is LOCKED | 📋 Adjustment | Same as PAID. Adjustment entry only. |

---

## Shift Edge Cases

| # | Scenario | Classification | Notes |
|---|---|---|---|
| EC-19 | Late arrival | ✅ Allowed | Calculate late minutes. Apply late deduction. |
| EC-20 | Undertime (left early) | ✅ Allowed | Calculate undertime minutes. Apply undertime deduction. |
| EC-21 | Half day | ❓ TBD | Needs definition of what qualifies as a half day. |
| EC-22 | Employee works on rest day | ❓ TBD | Rest day multiplier and tracking not yet implemented. |
| EC-23 | Employee works on holiday | ❓ TBD | Holiday list and multiplier not yet defined. |
| EC-24 | Paid leave | ❓ TBD | Leave management not yet implemented. |
| EC-25 | Unpaid leave | ❓ TBD | Leave management not yet implemented. |

---

## Payroll Generation Edge Cases

| # | Scenario | Classification | Notes |
|---|---|---|---|
| EC-26 | Payroll generated before attendance period is complete | 🔍 Manual Review | Payroll can be generated (status: DRAFT/CALCULATED), but should warn admin that the period has not ended. |
| EC-27 | Duplicate payroll generation for same period | 🚫 Blocked | Unique constraint on PayrollPeriod. If period already exists, block creation. If entries already exist for an employee in a period, block re-generation without explicit recalculate action. |
| EC-28 | Payroll approval by non-admin user | 🚫 Blocked | `requireAdmin` middleware blocks this at the API level. |
| EC-29 | Employee viewing another employee's payslip | 🚫 Blocked | Backend must verify `req.user.id` matches the employee's linked user id. |
| EC-30 | Payroll period overlaps with another existing period | 🚫 Blocked | Service layer must validate date ranges don't overlap. |

---

## Financial Edge Cases

| # | Scenario | Classification | Notes |
|---|---|---|---|
| EC-31 | Negative net pay (deductions exceed gross pay) | ✅ Allowed | Cap net pay at 0. Flag in payslip. Admin must review. |
| EC-32 | Extremely large deduction (e.g., data entry error) | 🔍 Manual Review | Consider a maximum deduction threshold check: TBD. |
| EC-33 | Rounding differences (floating point) | ✅ Allowed | Handled by `roundMoney()`. All values rounded to 2 decimal places. |
| EC-34 | Employee's hourly rate is 0 | 🔍 Manual Review | Technically valid (volunteer) but unusual. Flag for admin awareness. |

---

## System / Integrity Edge Cases

| # | Scenario | Classification | Notes |
|---|---|---|---|
| EC-35 | Failed payslip generation (DB error mid-process) | 🚫 Blocked | Sequelize transaction ensures all-or-nothing. Partial payslips must not be created. |
| EC-36 | Failed payroll calculation transaction halfway | 🚫 Blocked | Sequelize transaction with `try/catch/rollback` required in PayrollService. |
| EC-37 | Admin reopens PAID payroll | 🔍 Manual Review | Controlled reopen workflow required. Reason logged. Payslips marked superseded. |
| EC-38 | Admin cancels an APPROVED payroll | ❓ TBD | Should APPROVED periods be cancellable? Define in PAYROLL_WORKFLOW.md. |
