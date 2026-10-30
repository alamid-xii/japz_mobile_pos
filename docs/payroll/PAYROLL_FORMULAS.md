# PAYROLL_FORMULAS.md — Centralized Financial Formulas

> **Status:** Foundation Documentation
> **Last Updated:** 2026-10-06
> **CRITICAL:** All payroll calculation code must reference and implement these formulas. Do NOT create separate formulas elsewhere.
> **Related Documents:** [PAYROLL_RULES.md](./PAYROLL_RULES.md), [PAYROLL_ARCHITECTURE.md](./PAYROLL_ARCHITECTURE.md)

---

## Variable Reference

| Symbol | Meaning | Source |
|---|---|---|
| `HR` | Hourly Rate (employee's rate at calculation time) | `payroll_entries.snapshot_hourly_rate` |
| `RH` | Regular Hours worked in pay period | Sum of `Attendance.totalHours` within shift |
| `OH` | Overtime Hours worked in pay period | Hours beyond shift end |
| `LM` | Late Minutes in pay period | Sum of late minutes per attendance |
| `UM` | Undertime Minutes in pay period | Sum of undertime minutes per attendance |
| `AD` | Absence Days in pay period | Count of absent working days |
| `OT_MULT` | Overtime multiplier | TBD (configurable) |
| `RD_MULT` | Rest day multiplier | TBD (configurable) |
| `HOL_MULT` | Holiday multiplier | TBD (configurable) |
| `GP` | Gross Pay | Calculated |
| `TD` | Total Deductions | Calculated |
| `NP` | Net Pay | Calculated |

---

## Derived Rates

### Hourly Rate (Base)
```
HR = Employee.hourlyRate   (snapshot at payroll calculation time)
```

### Per-Minute Rate
```
PMR = HR / 60
```
> Used to convert late/undertime minutes into a monetary amount.

### Daily Rate (Derived)
```
DR = HR × RegularHoursPerDay
     where RegularHoursPerDay = TBD (e.g., 8)
```

---

## Earnings Formulas

### Basic Pay
```
BasicPay = HR × RH
```
> `RH` = total regular (non-overtime) hours worked within the pay period.

### Overtime Pay
```
OvertimePay = HR × OT_MULT × OH
              where OT_MULT = TBD (e.g., 1.25)
```

### Rest Day Pay (additional premium)
```
RestDayPremium = HR × (RD_MULT - 1.0) × HoursWorkedOnRestDay
                 where RD_MULT = TBD (e.g., 1.30)
```

### Holiday Pay (additional premium)
```
HolidayPremium = HR × (HOL_MULT - 1.0) × HoursWorkedOnHoliday
                 where HOL_MULT = TBD (e.g., 2.0 for regular holidays)
```

### Allowances
```
Allowances = Sum of all applicable fixed or variable allowances
             Types and amounts: TBD
```

### Bonuses
```
Bonuses = Sum of all applicable bonus amounts for the period
          Rules: TBD
```

### Gross Pay
```
GrossPay = BasicPay + OvertimePay + RestDayPremium + HolidayPremium + Allowances + Bonuses
```

---

## Deduction Formulas

### Late Deduction
```
LateDeduction = PMR × LM
                where PMR = HR / 60
                      LM  = Sum of late minutes across all attendance in the period
```
> Late minutes are only counted when `clockIn > (ShiftStart + GracePeriod)`.
> `LM` per day = `clockIn - ShiftStart` in minutes (ignoring grace offset: TBD exact handling).

### Undertime Deduction
```
UndertimeDeduction = PMR × UM
                     where PMR = HR / 60
                           UM  = Sum of undertime minutes across all attendance in the period
```
> `UM` per day = `ShiftEnd - clockOut` in minutes (only when `clockOut < ShiftEnd`).

### Absence Deduction
```
AbsenceDeduction = DR × AD
                   where DR = HR × RegularHoursPerDay  (TBD)
                         AD = count of absent working days (no attendance, no approved leave)
```

### Statutory Deductions (Government)
```
SSSDeduction       = TBD (table-based, not a simple percentage)
PhilHealthDeduction = TBD
PagIBIGDeduction   = TBD
WithholdingTax     = TBD
```
> These must NOT be hardcoded. They must be sourced from configurable contribution tables.

### Cash Advance Deduction
```
CashAdvanceDeduction = Sum of cash advances during the pay period = TBD
```

### Total Deductions
```
TotalDeductions = LateDeduction + UndertimeDeduction + AbsenceDeduction
                + CashAdvanceDeduction
                + SSSDeduction + PhilHealthDeduction + PagIBIGDeduction + WithholdingTax
                + OtherDeductions
```

---

## Net Pay

```
NetPay = GrossPay - TotalDeductions
```

> **Safety Rule:** `NetPay` must never be negative. If `TotalDeductions > GrossPay`, cap `TotalDeductions` at `GrossPay` and set `NetPay = 0`. Flag this for admin review.

---

## Rounding Policy

### Standard Rule
All monetary values must be rounded to **exactly 2 decimal places** before being stored in the database.

### Implementation (JavaScript)
```javascript
// REQUIRED: Use this function for all monetary rounding
const roundMoney = (value) => Math.round(value * 100) / 100;

// NEVER do this:
// const badResult = 0.1 + 0.2;  // 0.30000000000000004

// ALWAYS do this:
// const goodResult = roundMoney(0.1 + 0.2);  // 0.30
```

### Time Conversion Rule
```
// Clock times must be converted to decimal hours BEFORE multiplying by rate
// CORRECT:
const decimalHours = (clockOutMs - clockInMs) / (1000 * 60 * 60);
// e.g., 8h 30m = 8.5 hours ✓

// WRONG:
// Do not use HH:MM strings in arithmetic
// "8:30" is NOT 8.3 hours — it is 8.5 hours
```

### Database Storage
- All monetary fields use `DECIMAL(10, 2)` in MySQL.
- All hour fields use `DECIMAL(7, 2)` in MySQL.
- Do **not** store monetary values as `FLOAT` or `DOUBLE` — use `DECIMAL` for precision.
