# ATTENDANCE_RULES.md — Attendance & Payroll Impact

> **Status:** Foundation Documentation
> **Last Updated:** 2026-10-06
> **Related Documents:** [PAYROLL_RULES.md](./PAYROLL_RULES.md), [PAYROLL_FORMULAS.md](./PAYROLL_FORMULAS.md), [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)

---

## 1. Attendance Data Lifecycle

Payroll must consume **validated attendance**, never raw punches directly.

```
Raw Punch (clock-in/out timestamp)
        ↓
  Attendance Record Created
        ↓
  Validation Layer (grace period, shift matching, missing punch detection)
        ↓
  Validated Attendance (ready for payroll)
        ↓
  Payroll Calculator consumes validated data
```

### Definitions

| Term | Definition |
|---|---|
| **Raw Attendance** | The raw `clockIn` and `clockOut` timestamps recorded in the `Attendances` table. |
| **Validated Attendance** | Attendance that has been reviewed for completeness (no missing punches) and correctness (reasonable hours). |
| **Payroll-Ready Attendance** | Validated attendance for all employees in a pay period, confirmed complete before payroll generation begins. |

---

## 2. Clock In / Clock Out Rules

### 2.1 Clock In
- Records an `Attendance` row with `employeeId`, `date`, and `clockIn` timestamp.
- Only one active clock-in is allowed per employee per calendar day.
- Attempting to clock in when an open attendance record exists (no `clockOut`) must be **blocked** or flagged as a duplicate.

### 2.2 Clock Out
- Updates the existing open `Attendance` row with a `clockOut` timestamp.
- `totalHours` is calculated at clock-out time: `(clockOut - clockIn)` in decimal hours, rounded to 2 decimal places.
- Clocking out before clocking in is **blocked**.

### 2.3 Shift Start / Shift End
- **Shift Start Time:** TBD (e.g., 08:00 AM).
- **Shift End Time:** TBD (e.g., 05:00 PM).
- These are the boundaries used to calculate late, undertime, and overtime.

---

## 3. Grace Period

- **Grace Period Duration:** TBD (e.g., 5 minutes after shift start).
- An employee clocking in within the grace period is considered on-time. No late deduction is applied.
- Example: If shift starts at 08:00 and grace period is 5 minutes, arrivals up to 08:05 are on-time.

---

## 4. Late Calculation

- An employee is **late** if `clockIn > (shiftStart + gracePeriod)`.
- **Late Minutes** = `clockIn time - shiftStart time` (in minutes, ignoring grace period offset: TBD exact formula).
- Late minutes convert to a monetary deduction. See [PAYROLL_FORMULAS.md](./PAYROLL_FORMULAS.md).

---

## 5. Undertime Calculation

- An employee has **undertime** if `clockOut < shiftEnd`.
- **Undertime Minutes** = `shiftEnd time - clockOut time` (in minutes).
- Undertime minutes convert to a monetary deduction. See [PAYROLL_FORMULAS.md](./PAYROLL_FORMULAS.md).

---

## 6. Overtime Calculation

- An employee has **overtime** if `clockOut > shiftEnd`.
- **Overtime Hours** = `clockOut time - shiftEnd time` (in decimal hours).
- **Overtime approval:** TBD — whether overtime requires prior authorization.
- Overtime hours are compensated at a multiplier. See [PAYROLL_FORMULAS.md](./PAYROLL_FORMULAS.md).

---

## 7. Absence

- An employee is considered **absent** for a working day if:
  - No `Attendance` record exists for that employee on that date, AND
  - No approved leave record exists for that date.
- Absence results in a full-day deduction. See [PAYROLL_FORMULAS.md](./PAYROLL_FORMULAS.md).

---

## 8. Half-Day Handling

- **Definition of a half-day:** TBD (e.g., worked less than 4 hours on a day).
- **Half-day pay treatment:** TBD (e.g., 50% of daily rate deducted).

---

## 9. Paid Leave

- **Paid leave types:** TBD (e.g., Sick Leave, Vacation Leave).
- An employee on approved paid leave should receive full pay for that day with no deduction.
- A leave management sub-module is needed to support this: TBD.

---

## 10. Unpaid Leave

- An employee on approved unpaid leave receives a full-day deduction, the same as an absence.
- Must be differentiated from an unexcused absence in the attendance record for reporting purposes.

---

## 11. Rest Day

- **Rest day definition:** TBD (which days are rest days per schedule or per employee).
- An employee working on a rest day is compensated at a rest-day multiplier: TBD.
- An employee absent on a rest day receives no deduction.

---

## 12. Holiday

- **Holiday list:** TBD (Regular Holidays vs. Special Non-Working Holidays have different pay rules in PH).
- **Regular Holiday rate:** TBD.
- **Special Holiday rate:** TBD.
- An employee absent on a regular holiday: TBD (may still be entitled to pay in PH law).

---

## 13. Break Deduction

- **Break period:** TBD (e.g., 1 hour unpaid lunch break).
- If breaks are unpaid, the `totalHours` calculation must deduct break time.
- **Current behavior:** The existing `Attendance` model stores `totalHours` as the raw difference between `clockIn` and `clockOut`. Break deduction logic has not been implemented.

---

## 14. Missing Clock-In

- If only a `clockOut` exists (no `clockIn`): the attendance record is **incomplete**.
- **Payroll treatment:** TBD — options include: block payroll generation, treat as absent, or flag for manual review.
- Recommended: **Flag for manual review** before payroll generation is allowed.

---

## 15. Missing Clock-Out

- If only a `clockIn` exists (no `clockOut`): the attendance record is **incomplete**.
- This is the most common case (employee forgot to clock out).
- **Payroll treatment:** TBD — options include: treat as absent for that day, assign a default shift end, or flag for manual correction.
- Recommended: **Flag for manual correction** by an admin before payroll is generated.

---

## 16. Duplicate Attendance

- If two clock-in records exist for the same employee on the same date: this is an **error state**.
- The system must **prevent** this from occurring by checking for an existing open record before creating a new one.
- If a duplicate exists in the database (from a bug or direct DB edit), payroll generation must flag it rather than calculating incorrect hours.

---

## 17. Manual Attendance Correction

- Admin can correct an attendance record (update `clockIn`, `clockOut`, or `totalHours` manually).
- A correction must be logged via `createLog()` with `changes: { before, after }`.
- If the attendance record belongs to a `DRAFT` or `CALCULATED` payroll entry: trigger recalculation.
- If the attendance record belongs to an `APPROVED` or later payroll entry: **block the edit** and require the admin to reopen the payroll entry first.
- If the attendance record belongs to a `PAID` or `LOCKED` payroll entry: **require an adjustment entry** instead of editing.

---

## 18. Overnight Shifts (Crossing Midnight)

- If `clockOut` is on the day **after** `clockIn` (e.g., clock-in 10 PM, clock-out 6 AM next day):
  - The `date` field on the `Attendance` record should store the **clock-in date** (the day the shift started).
  - `totalHours` is calculated as the absolute difference between the two timestamps.
- Overnight shifts have not been explicitly handled in the current `Attendance` model. This is a **known gap** — see [TECH_DEBT.md](./TECH_DEBT.md).
