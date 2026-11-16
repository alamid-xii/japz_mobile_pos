# DATABASE_SCHEMA.md — Payroll Database Design

> **Status:** Foundation Documentation
> **Last Updated:** 2026-10-06
> **Related Documents:** [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md), [PAYROLL_RULES.md](./PAYROLL_RULES.md)

---

## 1. Existing Tables Relevant to Payroll (Do Not Recreate)

These tables exist in the current codebase and must be **reused**, not replaced.

### `Users` table (from `userModel.js`)
| Field | Type | Notes |
|---|---|---|
| `id` | INT (PK, auto) | Sequelize default |
| `name` | STRING | |
| `email` | STRING (unique) | |
| `password` | STRING (hashed) | bcrypt |
| `role` | ENUM(`admin`,`cashier`,`kitchen`) | Authorization role |
| `status` | ENUM(`pending`,`approved`,`rejected`,`inactive`) | Account approval status |
| `assignedCategories` | JSON | Kitchen use only |
| `createdAt`, `updatedAt` | DATE | Sequelize timestamps |

### `Employees` table (from `employeeModel.js`)
| Field | Type | Notes |
|---|---|---|
| `id` | INT (PK, auto) | |
| `name` | STRING | |
| `email` | STRING (unique) | |
| `phone` | STRING | |
| `password` | STRING | Separate credential from User |
| `role` | ENUM(`cashier`,`kitchen`) | Employee's operational role |
| `joinDate` | DATEONLY | |
| `assignedStationId` | INT (nullable) | FK → KitchenStations |
| `assignedCategories` | JSON | |
| `status` | ENUM(`active`,`inactive`) | |
| `hourlyRate` | DECIMAL(10,2) | **Added for payroll** |
| `createdAt`, `updatedAt` | DATE | |

> **Gap:** The `Employee` model is separate from the `User` model. There is currently no FK linking them. This is a known architectural gap. See [TECH_DEBT.md](./TECH_DEBT.md).

### `Logs` table (from `logModel.js`)
Reused for all payroll audit logging. See `utils/logger.js`. No modifications needed.

---

## 2. Existing Payroll Tables (Created for this module — need review)

### `Attendances` table (from `attendanceModel.js`)
| Field | Type | Nullable | Notes |
|---|---|---|---|
| `id` | INT (PK, auto) | No | |
| `employeeId` | INT | No | FK → `Employees.id` |
| `date` | DATEONLY | No | The calendar date of the shift |
| `clockIn` | TIME | Yes | Null if not yet clocked in |
| `clockOut` | TIME | Yes | Null if not yet clocked out |
| `totalHours` | DECIMAL(5,2) | No | Computed at clock-out |
| `createdAt`, `updatedAt` | DATE | No | |

> **Gap:** The current model uses `TIME` type for `clockIn`/`clockOut`. For overnight shifts, this is insufficient — a `DATETIME` type is needed to capture the date component as well. See [TECH_DEBT.md](./TECH_DEBT.md).

### `Payrolls` table (from `payrollModel.js`)
| Field | Type | Nullable | Notes |
|---|---|---|---|
| `id` | INT (PK, auto) | No | |
| `employeeId` | INT | No | FK → `Employees.id` |
| `periodStart` | DATEONLY | No | Pay period start date |
| `periodEnd` | DATEONLY | No | Pay period end date |
| `totalHours` | DECIMAL(7,2) | No | |
| `grossPay` | DECIMAL(10,2) | No | |
| `deductions` | DECIMAL(10,2) | No | |
| `netPay` | DECIMAL(10,2) | No | |
| `status` | ENUM(`pending`,`paid`) | No | **Insufficient** — needs full status machine |
| `createdAt`, `updatedAt` | DATE | No | |

> **Critical Gap:** The current `Payrolls` model has significant limitations:
> 1. No historical snapshot fields (employee name, rate used, breakdown of earnings/deductions).
> 2. Status values (`pending`,`paid`) don't match the full workflow defined in [PAYROLL_WORKFLOW.md](./PAYROLL_WORKFLOW.md).
> 3. No concept of a "Payroll Period" as a separate entity — payroll periods and entries are merged.
> These must be addressed before implementation begins.

---

## 3. Proposed New / Modified Tables

### 3.1 `PayrollConfigs` (New)
Stores dynamic configuration values for payroll calculation rules. Only one active row is needed, or a key-value structure. We'll use a key-value structure for flexibility.

| Field | Type | Nullable | Notes |
|---|---|---|---|
| `id` | INT (PK, auto) | No | |
| `configKey` | STRING (unique) | No | e.g., `gracePeriodMinutes`, `overtimeMultiplier` |
| `configValue` | STRING | No | Stored as string, cast as needed |
| `description` | STRING | Yes | What this config does |
| `updatedBy` | INT | No | FK → `Users.id` (admin who updated) |
| `createdAt`, `updatedAt` | DATE | No | |

**Default Keys Needed:**
- `regularHoursPerDay` (default: "8")
- `workingDays` (default: "Mon-Sat")
- `restDays` (default: "Sun")
- `gracePeriodMinutes` (default: "5")
- `overtimeMultiplier` (default: "1.25")

### 3.2 `PayrollPeriods` (New)
A container that defines a pay period and tracks its overall status.

| Field | Type | Nullable | Notes |
|---|---|---|---|
| `id` | INT (PK, auto) | No | |
| `periodStart` | DATEONLY | No | First day of pay period |
| `periodEnd` | DATEONLY | No | Last day of pay period (cutoff date) |
| `payDate` | DATEONLY | Yes | Scheduled payment date. TBD. |
| `status` | ENUM(`DRAFT`,`CALCULATED`,`UNDER_REVIEW`,`APPROVED`,`PAID`,`LOCKED`,`CANCELLED`) | No | Default: `DRAFT` |
| `description` | STRING | Yes | Optional label (e.g., "October 1-15, 2026") |
| `createdBy` | INT | No | FK → `Users.id` (admin who created) |
| `approvedBy` | INT | Yes | FK → `Users.id` (admin who approved) |
| `approvedAt` | DATE | Yes | Timestamp of approval |
| `cancelReason` | TEXT | Yes | Populated if CANCELLED |
| `createdAt`, `updatedAt` | DATE | No | |

**Indexes:** `status`, `periodStart`, `periodEnd`
**Constraints:** `periodStart` must be before `periodEnd`. No overlapping periods (enforced at service level).

### 3.2 `PayrollEntries` (Replaces/Extends current `Payrolls` model)
One record per employee per payroll period. Stores the historical snapshot.

| Field | Type | Nullable | Notes |
|---|---|---|---|
| `id` | INT (PK, auto) | No | |
| `payrollPeriodId` | INT | No | FK → `PayrollPeriods.id` |
| `employeeId` | INT | No | FK → `Employees.id` |
| **--- Snapshot Fields ---** | | | Copied at calculation time, immutable after APPROVED |
| `snapshotEmployeeName` | STRING | No | Employee's name at calculation time |
| `snapshotRole` | STRING | No | Employee's role at calculation time |
| `snapshotHourlyRate` | DECIMAL(10,2) | No | Hourly rate used for this calculation |
| **--- Earnings ---** | | | |
| `regularHours` | DECIMAL(7,2) | No | Total regular hours in period |
| `overtimeHours` | DECIMAL(7,2) | No | Total overtime hours in period |
| `basicPay` | DECIMAL(10,2) | No | |
| `overtimePay` | DECIMAL(10,2) | No | |
| `holidayPay` | DECIMAL(10,2) | No | Default: 0 |
| `restDayPay` | DECIMAL(10,2) | No | Default: 0 |
| `allowances` | DECIMAL(10,2) | No | Default: 0 |
| `bonuses` | DECIMAL(10,2) | No | Default: 0 |
| `grossPay` | DECIMAL(10,2) | No | Sum of all earnings |
| **--- Deductions ---** | | | |
| `lateMinutes` | INT | No | Total late minutes in period |
| `undertimeMinutes` | INT | No | Total undertime minutes in period |
| `absenceDays` | DECIMAL(4,1) | No | Total absent days (0.5 for half-days) |
| `lateDeduction` | DECIMAL(10,2) | No | |
| `undertimeDeduction` | DECIMAL(10,2) | No | |
| `absenceDeduction` | DECIMAL(10,2) | No | |
| `cashAdvanceDeduction` | DECIMAL(10,2) | No | Default: 0 |
| `otherDeductions` | DECIMAL(10,2) | No | Default: 0 |
| `totalDeductions` | DECIMAL(10,2) | No | Sum of all deductions |
| **--- Net ---** | | | |
| `netPay` | DECIMAL(10,2) | No | GrossPay - TotalDeductions |
| **--- Metadata ---** | | | |
| `status` | ENUM(`DRAFT`,`CALCULATED`,`APPROVED`) | No | Entry-level status |
| `notes` | TEXT | Yes | Admin notes |
| `calculatedAt` | DATE | Yes | When calculation was last run |
| `calculatedBy` | INT | Yes | FK → `Users.id` |
| `createdAt`, `updatedAt` | DATE | No | |

**Indexes:** `payrollPeriodId`, `employeeId`, `(payrollPeriodId, employeeId)` UNIQUE
**Constraint:** One entry per employee per period.

### 3.3 `PayrollAdjustments` (New)
Adjustments made to entries post-PAID. Never modifies original entries.

| Field | Type | Nullable | Notes |
|---|---|---|---|
| `id` | INT (PK, auto) | No | |
| `payrollEntryId` | INT | No | FK → `PayrollEntries.id` |
| `adjustmentType` | ENUM(`earning`,`deduction`) | No | |
| `description` | STRING | No | What the adjustment is for |
| `amount` | DECIMAL(10,2) | No | Positive = add, Negative = subtract |
| `reason` | TEXT | No | Required explanation |
| `createdBy` | INT | No | FK → `Users.id` |
| `createdAt`, `updatedAt` | DATE | No | |

### 3.4 `Payslips` (New)
The employee-facing record generated from a PayrollEntry.

| Field | Type | Nullable | Notes |
|---|---|---|---|
| `id` | INT (PK, auto) | No | |
| `payrollEntryId` | INT (unique) | No | FK → `PayrollEntries.id` |
| `employeeId` | INT | No | FK → `Employees.id` |
| `generatedAt` | DATE | No | When payslip was generated |
| `generatedBy` | INT | No | FK → `Users.id` |
| `isSuperseded` | BOOLEAN | No | True if payroll was reopened after payslip was generated |
| `createdAt`, `updatedAt` | DATE | No | |

---

## 4. Relationship Summary

```
PayrollPeriods (1) ──────── (many) PayrollEntries
Employees (1) ──────────── (many) PayrollEntries
PayrollEntries (1) ─────── (1) Payslips
PayrollEntries (1) ─────── (many) PayrollAdjustments
Employees (1) ──────────── (many) Attendances
Users (1) ──────────────── (many) PayrollPeriods [createdBy]
Users (1) ──────────────── (many) PayrollEntries [calculatedBy]
```
