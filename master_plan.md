# JAPZ Payroll Module — Master Plan
**Status:** Phases 1, 2, and 3 Complete (Production-Ready) | **Last Updated:** 2026-10-06

---

## 📁 Documentation Created

| File | Purpose |
|---|---|
| [PROJECT_CONTEXT.md](file:///c:/laragon/www/japz_mobile_pos/docs/payroll/PROJECT_CONTEXT.md) | Tech stack, architecture, 9 non-negotiable principles |
| [PAYROLL_RULES.md](file:///c:/laragon/www/japz_mobile_pos/docs/payroll/PAYROLL_RULES.md) | Business rules — pay frequency, earnings, deductions |
| [ATTENDANCE_RULES.md](file:///c:/laragon/www/japz_mobile_pos/docs/payroll/ATTENDANCE_RULES.md) | Clock-in/out, late, undertime, overnight, corrections |
| [PAYROLL_FORMULAS.md](file:///c:/laragon/www/japz_mobile_pos/docs/payroll/PAYROLL_FORMULAS.md) | Every formula — centralized, single source of truth |
| [PAYROLL_WORKFLOW.md](file:///c:/laragon/www/japz_mobile_pos/docs/payroll/PAYROLL_WORKFLOW.md) | 7-status lifecycle + full allowed/forbidden transitions |
| [PAYROLL_PERMISSIONS.md](file:///c:/laragon/www/japz_mobile_pos/docs/payroll/PAYROLL_PERMISSIONS.md) | 18-permission × 3-role matrix |
| [DATABASE_SCHEMA.md](file:///c:/laragon/www/japz_mobile_pos/docs/payroll/DATABASE_SCHEMA.md) | Existing + 5 new proposed tables |
| [PAYROLL_ARCHITECTURE.md](file:///c:/laragon/www/japz_mobile_pos/docs/payroll/PAYROLL_ARCHITECTURE.md) | Layered service design + component specs |
| [EDGE_CASES.md](file:///c:/laragon/www/japz_mobile_pos/docs/payroll/EDGE_CASES.md) | 38 edge cases classified |
| [TESTING_PLAN.md](file:///c:/laragon/www/japz_mobile_pos/docs/payroll/TESTING_PLAN.md) | 20 unit + 15 integration tests + 2 golden scenarios |
| [DEFINITION_OF_DONE.md](file:///c:/laragon/www/japz_mobile_pos/docs/payroll/DEFINITION_OF_DONE.md) | 30-item completion checklist per feature |
| [CODING_STANDARDS.md](file:///c:/laragon/www/japz_mobile_pos/docs/payroll/CODING_STANDARDS.md) | Naming, API patterns, verified `createLog()` signature |
| [SECURITY_RULES.md](file:///c:/laragon/www/japz_mobile_pos/docs/payroll/SECURITY_RULES.md) | Auth, audit trail, mass assignment, exports |
| [TECH_DEBT.md](file:///c:/laragon/www/japz_mobile_pos/docs/payroll/TECH_DEBT.md) | 6 real bugs found during inspection |
| [DECISIONS.md](file:///c:/laragon/www/japz_mobile_pos/docs/payroll/DECISIONS.md) | 5 architecture decision records |
| [CURRENT_TASK.md](file:///c:/laragon/www/japz_mobile_pos/docs/payroll/CURRENT_TASK.md) | Reusable template for each feature |
| [AI_AGENT_RULES.md](file:///c:/laragon/www/japz_mobile_pos/docs/payroll/AI_AGENT_RULES.md) | Full AI coding agent protocol |
| [PLAN_AUDIT.md](file:///c:/laragon/www/japz_mobile_pos/docs/payroll/PLAN_AUDIT.md) | 19-item codebase verification, 6 gaps found & fixed |
| [ADVANCED_PLAN.md](file:///c:/laragon/www/japz_mobile_pos/docs/payroll/ADVANCED_PLAN.md) | 5-phase future roadmap |

---

## 🏗️ System We Are Building

### What Exists Today (Confirmed by Code Inspection)

```
✅  Employee model         → has hourlyRate DECIMAL(10,2)
✅  Attendance model       → has clockIn, clockOut, totalHours (TIME type — gap)
✅  Payroll model          → has grossPay/deductions/netPay but only 2 statuses (gap)
✅  verifyToken middleware → JWT Bearer token auth confirmed
✅  createLog() utility   → object-signature confirmed in utils/logger.js
✅  businessHoursModel    → exact same pattern as our PayrollConfigs plan
❌  No payroll routes     → completely greenfield
❌  No attendance routes  → completely greenfield
❌  No payroll services   → completely greenfield
❌  No payroll pages      → completely greenfield
❌  No requireAdmin mid.  → must create it
```

### What We Will Build

```
New Models:      PayrollConfig, PayrollPeriod, PayrollEntry,
                 PayrollAdjustment, Payslip
New Services:    payrollCalculator.js, payrollService.js,
                 attendanceService.js, payrollConfigService.js
New Controller:  payrollController.js
New Routes:      /api/payroll/*, /api/attendance/*
New Pages:       PayrollDashboard, PayrollPeriodDetail,
                 AttendanceManagement, Payslip, PayrollReports
New API calls:   payrollAPI, attendanceAPI in api.ts
```

---

## 📐 Confirmed Business Rules

| Rule | Value |
|---|---|
| **Pay Frequency** | Monthly (Oct 1–31, Nov 1–30, etc.) |
| **Regular Hours/Day** | Dynamic — default 8hrs, stored in `PayrollConfigs` |
| **Grace Period** | Dynamic — default 5 min, stored in `PayrollConfigs` |
| **Overtime Multiplier** | Dynamic — default 1.25×, stored in `PayrollConfigs` |
| **Rest Days** | Dynamic — default Sunday, stored in `PayrollConfigs` |
| **Break Time** | Dynamic — default 1hr unpaid, stored in `PayrollConfigs` |
| **Statutory Deductions** | Deferred to Phase 3 |

---

## 💰 Core Payroll Formula Chain

```
Basic Pay        = Hourly Rate × Regular Hours
Overtime Pay     = Hourly Rate × 1.25 × Overtime Hours
─────────────────────────────────────────────────────
Gross Pay        = Basic Pay + Overtime Pay + Allowances + Bonuses

Late Deduction   = (Hourly Rate ÷ 60) × Late Minutes
Undertime Ded.   = (Hourly Rate ÷ 60) × Undertime Minutes
Absence Ded.     = (Hourly Rate × Hrs/Day) × Absent Days
─────────────────────────────────────────────────────
Total Deductions = Late + Undertime + Absence + Cash Advance + Other
Net Pay          = max(0,  Gross Pay − Total Deductions)

ALL values → roundMoney() → DECIMAL(10,2) before storage
```

---

## 🔄 Payroll Status Machine

```
DRAFT → CALCULATED → UNDER_REVIEW → APPROVED → PAID → LOCKED
                                        ↑           ↓
                                     (reopen)   (adjustment entries only)
                  ↘ CANCELLED (terminal, anytime before PAID)
```

> **Golden Rule:** Once `APPROVED` → values are frozen. Once `PAID` → immutable forever.

---

## 🗄️ Database Tables (New)

```
PayrollConfigs     → grace period, OT multiplier, hours/day, etc. (admin-editable)
PayrollPeriods     → one row per pay month (Oct 2026, Nov 2026...)
PayrollEntries     → one row per employee per period (stores snapshot)
PayrollAdjustments → post-PAID corrections (never edits original)
Payslips           → employee-facing view record
```

---

## 🔒 Non-Negotiable Principles (9)

1. Calculations are **deterministic** — same input = same output, always
2. Historical payroll **never changes** — snapshots protect old records
3. Approved payroll **cannot silently recalculate**
4. All money uses **`roundMoney()`** — never raw float arithmetic
5. All formulas live **only** in `payrollCalculator.js`
6. Authorization is **backend-enforced**, not frontend-hidden
7. UI calculations are **display-only** — backend values are truth
8. All sensitive actions are **audited** via `createLog()`
9. `PayrollCalculator` has **unit tests** before any UI is built

---

## 📋 Implementation Phases

### Phase 1 — Foundation & Core Engine (✅ COMPLETE)
```
[x] Step 1:  Fix Tech Debt TD-02  → Redesign Payroll model into PayrollPeriod + PayrollEntry + Payslip
[x] Step 2:  Fix Tech Debt TD-01  → Change clockIn/clockOut to DATETIME
[x] Step 3:  Fix Tech Debt TD-06  → Install Vitest test framework
[x] Step 4:  Create PayrollConfig  → Model + seed defaults + admin CRUD routes
[x] Step 5:  Build PayrollCalculator → Pure function, fully unit tested (27 tests passing)
[x] Step 6:  Build AttendanceService → Clock in/out, validation, missing punch detection, corrections
[x] Step 7:  Build PayrollService   → Orchestrate calculation, transactions, snapshotting, logging
[x] Step 8:  Build PayrollController → Standardized responses & error handling
[x] Step 9:  Add payroll routes     → Sub-routers: payrollRoutes.js (admin) & employeeRoutes.js
[x] Step 10: Build payrollAPI       → payrollAPI, attendanceAPI, employeeAPI in api.ts
```

### Phase 2 — Admin & Employee UI (✅ COMPLETE)
```
[x] Step 11: PayrollDashboard.tsx       → List periods, create period modal, period metrics
[x] Step 12: AttendanceManagement.tsx   → Date range filter, missing punch validation, inline correction
[x] Step 13: PayrollPeriodDetail.tsx    → Period header, state machine lifecycle actions, entry expansion
[x] Step 14: Payslip.tsx / MyPayslips   → Detailed payslip modal & employee self-service view
[x] Step 15: PayrollSettings.tsx        → Dynamic edit of PayrollConfig values (grace period, multipliers)
[x] Employee: ClockInOut.tsx            → Employee live punch widget + shift indicator (Cashier & Kitchen)
[x] Routing & Layouts                   → App.tsx, AdminLayout, CashierLayout, KitchenLayout updated
```

### Phase 3 — Reports & Polish (✅ COMPLETE)
```
[x] Step 16: PayrollReports.tsx         → Summary analytics, labor cost % vs POS sales
[x] Step 17: Export (CSV/PDF)           → Admin CSV export for periods/entries + client download
[x] Step 18: Payroll log viewer         → Module-filtered audit logs viewer with expandable diffs
```

### Phase 4 — Advanced (Future)
```
Employee self-service portal, statutory deduction tables (SSS/PhilHealth/Pag-IBIG),
13th month pay, geofenced clock-in, labor cost vs sales analytics
```

---

## ⚠️ Known Tech Debt Status

| ID | Issue | Priority | Status |
|---|---|---|---|
| TD-01 | `clockIn`/`clockOut` is `TIME` not `DATETIME` | 🔴 Fix first | ✅ Resolved (`attendanceModel.js`) |
| TD-02 | `Payroll` model too simple — needs full redesign | 🔴 Fix first | ✅ Resolved (New period/entry models) |
| TD-06 | No test framework installed | 🔴 Fix before calculator | ✅ Resolved (Vitest installed & configured) |
| TD-03 | `Employee` ↔ `User` not linked | 🟡 Needed for self-service | ✅ Resolved (`userId` mapping + employee lookup) |
| TD-04 | All routes in one 2,891-line file | 🟡 Create sub-router | ✅ Resolved (Isolated `payrollRoutes.js` & `employeeRoutes.js`) |
| TD-05 | `Log.action` ENUM needs payroll values | 🟡 During implementation | ✅ Resolved (Added payroll action types) |

---

> **Stability Rule:** Working functionality (POS, orders, kitchen) has absolute priority.
> Payroll routes are completely isolated — they cannot break existing features.
