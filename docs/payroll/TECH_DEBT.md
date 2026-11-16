# TECH_DEBT.md — Known Technical Debt & Gaps

> **Purpose:** Document discovered issues that should NOT be fixed during unrelated development. Fix them deliberately in a planned task.
> **Last Updated:** 2026-10-06

---

## How to Use This File

When you discover a technical issue during development of an unrelated feature, **do not fix it immediately**. Instead:
1. Add an entry here.
2. Finish your current task.
3. Plan the fix as a separate task.

---

## Known Issues

### TD-01: `Attendance` model uses `TIME` type — insufficient for overnight shifts

| Field | Value |
|---|---|
| **Issue** | `clockIn` and `clockOut` are stored as `TIME` in `attendanceModel.js`. `TIME` only stores the time of day (HH:MM:SS), not the date. For an employee who starts at 10:00 PM and clocks out at 6:00 AM the next day, the `TIME` type cannot represent this correctly. |
| **Location** | `japz-backend/models/attendanceModel.js` |
| **Impact** | Overnight shift hours calculated incorrectly. `totalHours` would be negative or wrong. |
| **Suggested Fix** | Change `clockIn` and `clockOut` to `DataTypes.DATE` (DATETIME). Store full timestamp, not just time. The `date` field remains as the shift-start date for grouping. |
| **Priority** | 🔴 High — Must fix before payroll module goes live. |
| **Date Discovered** | 2026-10-06 |

---

### TD-02: `Payrolls` model is insufficient for full payroll workflow

| Field | Value |
|---|---|
| **Issue** | The current `payrollModel.js` (which creates a `Payrolls` table) has: (1) no historical snapshot fields, (2) only `pending`/`paid` statuses, and (3) merges the concept of "payroll period" and "payroll entry" into one record. It does not match the architecture defined in `DATABASE_SCHEMA.md`. |
| **Location** | `japz-backend/models/payrollModel.js` |
| **Impact** | Cannot support multi-employee payroll periods, the full status workflow, or historical data integrity. |
| **Suggested Fix** | Replace with three separate models: `PayrollPeriod`, `PayrollEntry`, and retain `Payroll` only if needed for backward compat. See `DATABASE_SCHEMA.md` for the full design. |
| **Priority** | 🔴 Critical — Must be resolved before any payroll feature is implemented. |
| **Date Discovered** | 2026-10-06 |

---

### TD-03: `Employee` and `User` models are not linked

| Field | Value |
|---|---|
| **Issue** | The `Employee` model and `User` model are two separate, unrelated tables. An employee's operational login (as `cashier` or `kitchen`) is stored in `User`, but their payroll data (hourly rate, join date) is stored in `Employee`. There is no foreign key linking them. This makes employee self-service payslip access difficult to implement securely. |
| **Location** | `japz-backend/models/employeeModel.js`, `japz-backend/models/userModel.js` |
| **Impact** | Cannot determine which `User` corresponds to which `Employee` without a shared field (e.g., email). Makes enforcing "employee can only see own payslip" logic fragile. |
| **Suggested Fix** | Add a `userId` foreign key to the `Employee` model, or establish that `Employee.email === User.email` is the linking convention. Document which is canonical. |
| **Priority** | 🟡 Medium — Needed for employee self-service. Not blocking for admin-only payroll. |
| **Date Discovered** | 2026-10-06 |

---

### TD-04: All routes are in a single `routes/index.js` file (2,891 lines)

| Field | Value |
|---|---|
| **Issue** | The entire backend routing and inline controller logic is in one file (`routes/index.js`) that is already 2,891 lines long. Payroll routes will add significant additional length. |
| **Location** | `japz-backend/routes/index.js` |
| **Impact** | High merge conflict risk for the group project. Difficult to navigate and review. |
| **Suggested Fix** | Split routes into sub-routers: `routes/payroll.js`, `routes/attendance.js`, etc., and import them in `routes/index.js`. |
| **Priority** | 🟡 Medium — Refactor before merging with the group. |
| **Date Discovered** | 2026-10-06 |

---

### TD-05: `Log` model's `action` ENUM needs payroll-specific values

| Field | Value |
|---|---|
| **Issue** | The `Log.action` field is a MySQL ENUM with fixed values. Payroll actions (`PAYROLL_APPROVED`, `PAYROLL_CALCULATED`, `ATTENDANCE_CORRECTED`, etc.) are not in the ENUM. Currently these must use `'OTHER'` as a workaround. |
| **Location** | `japz-backend/models/logModel.js` |
| **Impact** | Payroll actions cannot be filtered in the audit log by specific action type. |
| **Suggested Fix** | Add payroll-specific action values to the ENUM in `logModel.js`. Requires a DB migration. |
| **Priority** | 🟡 Medium — Should be done when payroll module is first implemented. |
| **Date Discovered** | 2026-10-06 |

---

### TD-06: No test framework installed

| Field | Value |
|---|---|
| **Issue** | The project has no testing library in either `japz-backend` or `japz-web`. |
| **Location** | `japz-backend/package.json`, `japz-web/package.json` |
| **Impact** | Payroll calculator cannot be unit tested without first installing a test framework. |
| **Suggested Fix** | Install `vitest` in `japz-backend` as a dev dependency. Add a `test` script to `package.json`. |
| **Priority** | 🔴 High — Must be done before implementing `PayrollCalculator`. |
| **Date Discovered** | 2026-10-06 |
