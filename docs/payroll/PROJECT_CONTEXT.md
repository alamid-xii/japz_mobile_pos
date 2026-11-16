# PROJECT_CONTEXT.md — JAPZ Payroll Module

> **Status:** Foundation Documentation — Do not implement until this document is approved.
> **Last Updated:** 2026-10-06
> **Related Documents:** [PAYROLL_RULES.md](./PAYROLL_RULES.md), [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md), [AI_AGENT_RULES.md](./AI_AGENT_RULES.md)

---

## 1. Project Overview

| Field | Value |
|---|---|
| **Project Name** | JAPZ |
| **Type** | Restaurant Management System |
| **Current Scope** | Payroll Management Module |
| **Backend** | Node.js (ES Modules) + Express.js |
| **Frontend** | React 19 + TypeScript + Vite |
| **Database** | MySQL via Sequelize ORM |
| **Auth** | JWT (Bearer token, 7d expiry) stored in `localStorage` |
| **Deployment** | Railway (backend), Vercel (frontend) |
| **Styling** | Tailwind CSS v3 |
| **Icons** | Lucide React |
| **HTTP Client** | Axios |
| **Routing** | React Router v7 |

---

## 2. Existing System Architecture (Inspected)

### 2.1 Backend Structure (`japz-backend/`)
```
japz-backend/
├── controllers/       # Thin controllers (auth, feedback, home)
├── models/            # Sequelize models (one file per model)
│   ├── db.js          # Sequelize instance + multi-env DB config
│   ├── index.js       # All associations + single export point
│   ├── userModel.js
│   ├── employeeModel.js  ← Payroll-relevant
│   ├── attendanceModel.js  ← Created for payroll
│   ├── payrollModel.js     ← Created for payroll
│   └── ...others
├── routes/
│   └── index.js       # ALL API routes in a single large file
├── services/          # Business logic services (AI, email, sheets)
├── utils/
│   └── logger.js      # Centralized audit logging utility
├── migrate.js         # Interactive DB migration (drops + recreates)
└── index.js           # App entry point
```

### 2.2 Frontend Structure (`japz-web/`)
```
japz-web/
├── src/
│   ├── App.tsx         # Route definitions with role-based protection
│   ├── pages/
│   │   ├── admin/      # Admin-only pages (Dashboard, Employees, etc.)
│   │   ├── cashier/    # Cashier-only pages (POS, Orders, etc.)
│   │   └── kitchen/    # Kitchen-only pages
│   ├── layouts/        # AdminLayout, CashierLayout, KitchenLayout
│   ├── components/     # Shared components (ProtectedRoute, etc.)
│   ├── hooks/          # useAuth context hook
│   └── services/
│       └── api.ts      # Centralized Axios API service file
```

### 2.3 Authentication Pattern
- Users register → status `'pending'` → admin approves → status `'approved'`
- Login issues JWT token → stored in `localStorage` as `'authToken'`
- All protected routes use `verifyToken` middleware that decodes JWT from `Authorization: Bearer <token>` header
- `req.user` is populated with `{ id, email, name, role }` after verification

### 2.4 Existing Roles (from `userModel.js`)
```
admin    — Full system access
cashier  — POS + order management
kitchen  — Kitchen order viewing
```

### 2.5 Existing Logging System (`utils/logger.js`)
The project has a fully functional audit logging system via `createLog()`. Payroll actions **must** use this existing utility. It supports:
- `userId`, `userName`, `action`, `module`, `entityId`, `entityType`
- `description`, `changes` (JSON before/after), `ipAddress`, `status`, `errorMessage`

### 2.6 Existing API Response Pattern
Routes return raw JSON objects without a consistent wrapper. Errors return `{ error: "message" }`. The `backend_standards.md` rule file defines the target standard going forward.

---

## 3. How Payroll Fits into JAPZ

JAPZ is a restaurant management system. The **Payroll module** is an administrative function operated exclusively by `admin` users. It does not affect cashier or kitchen workflows directly.

```
┌─────────────────────────────────────────────────────────┐
│                    JAPZ Admin Panel                     │
├──────────┬──────────┬──────────┬──────────┬────────────-┤
│Dashboard │Employees │  Menu    │  Stocks  │  PAYROLL    │ ← NEW
│Sales     │Settings  │Discounts │ Feedback │  (this mod) │
└──────────┴──────────┴──────────┴──────────┴─────────────┘
```

The payroll module reads from the **Employee** table (created by the core team) and the **Attendance** table (created as part of this module). It produces **Payroll period records** and **Payslips** that are owned entirely by this module.

---

## 4. Relevant Modules & Their Scope

| Module | Status | Payroll Relationship |
|---|---|---|
| **Users** | ✅ Existing | Auth identity. `admin` role controls payroll. |
| **Employees** | ✅ Existing | Core entity. Payroll uses `Employee.id`, `name`, `role`, `hourlyRate`, `status`. |
| **Attendance** | ⚡ New (payroll) | Records clock-in/out times. Source of truth for hours worked. |
| **Payroll Periods** | ⚡ New (payroll) | Defines the date range for a payroll run. |
| **Payroll Entries** | ⚡ New (payroll) | Per-employee calculated result for a payroll period. Stores historical snapshot. |
| **Payslips** | ⚡ New (payroll) | Employee-facing summary generated from a Payroll Entry. |
| **Audit Log** | ✅ Existing | Reused for payroll audit trail via `createLog()`. |
| **Kitchen Stations** | ✅ Existing | No direct payroll relationship. |
| **Orders / POS** | ✅ Existing | No direct payroll relationship (commission tracking: TBD). |

---

## 5. Key Terminology

| Term | Definition |
|---|---|
| **Pay Period** | The date range (e.g., Oct 1–15) for which payroll is calculated. |
| **Payroll Run** | The act of calculating payroll for all eligible employees in a pay period. |
| **Payroll Entry** | A single employee's calculated wages for one pay period. Contains the historical snapshot. |
| **Payslip** | The employee-facing document derived from a Payroll Entry. |
| **Gross Pay** | Total earnings before deductions. |
| **Net Pay** | Take-home pay after all deductions. |
| **Cutoff Date** | The last date attendance is included in a payroll calculation. |
| **Snapshot** | A copy of employee rate data saved inside the Payroll Entry at calculation time, so historical data remains accurate even if the employee's rate changes later. |
| **Hourly Rate** | The employee's compensation per hour of work. Currently the only supported rate type. |
| **Clock-In / Clock-Out** | The timestamps recorded when an employee starts and ends their work shift. |
| **Regular Hours** | Hours worked within the defined standard shift window. |
| **Overtime Hours** | Hours worked beyond the regular shift. Multiplier: TBD. |
| **Late Minutes** | Minutes an employee arrived after their shift start time. |
| **Undertime Minutes** | Minutes an employee left before their shift end time. |
| **Deduction** | Any amount subtracted from Gross Pay. |

---

## 6. Non-Negotiable Payroll Principles

These principles are absolute. They may not be overridden during implementation.

### P-01: Payroll Calculations Must Be Deterministic
Given the same inputs (attendance data, rate, payroll rules), the same output must always be produced. No randomness or external state may influence calculation results.

### P-02: Historical Payroll Must Remain Historically Accurate
Once a payroll period is finalized, its stored monetary values must never change due to employee data changes (salary updates, name changes, position changes). Payroll entries must store their own snapshot of the rate used at calculation time.

### P-03: Approved Payroll Must Not Silently Change
An approved or paid payroll entry must not be automatically recalculated. Any change to it must go through an explicit, authorized reopen-and-adjust workflow that is logged.

### P-04: Financial Calculations Must Use Safe Numeric Handling
All monetary values must be rounded to 2 decimal places using `Math.round(value * 100) / 100` before being stored. JavaScript's native floating-point arithmetic must not be used for final monetary values without explicit rounding.

### P-05: Payroll Formulas Must Be Centralized
All payroll calculation logic must live in a dedicated `PayrollCalculator` service. No formula may be duplicated across controllers, routes, or frontend components. See [PAYROLL_FORMULAS.md](./PAYROLL_FORMULAS.md).

### P-06: Authorization Must Be Enforced on the Backend
Every payroll API endpoint must verify the user's JWT token and confirm the `admin` role server-side. Frontend route-hiding is not authorization.

### P-07: UI Calculations Are Not Authoritative
The frontend may display calculated values for preview purposes, but the backend's calculated values are the source of truth. Payslips must reflect backend-calculated data.

### P-08: Payroll Changes Must Be Auditable
The following actions must be written to the `Logs` table using `createLog()`: salary changes, attendance corrections, payroll generation, recalculation, manual adjustments, approval, marking as paid, reopening, and cancellation.

### P-09: Tests Are Required for Financial Calculations
The `PayrollCalculator` must have unit tests covering all calculation paths before any payroll feature can be considered "Done". See [TESTING_PLAN.md](./TESTING_PLAN.md).
