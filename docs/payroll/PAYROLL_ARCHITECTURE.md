# PAYROLL_ARCHITECTURE.md — Code Architecture & Separation of Concerns

> **Status:** Foundation Documentation
> **Last Updated:** 2026-10-06
> **Related Documents:** [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md), [PAYROLL_FORMULAS.md](./PAYROLL_FORMULAS.md), [CODING_STANDARDS.md](./CODING_STANDARDS.md)

---

## 1. Guiding Principle

**Payroll calculations must never live inside a controller, route handler, or UI component.**

The calculation engine must be isolated, independently testable, and deterministic. Any code path that calls a payroll calculation must go through the `PayrollCalculator` service.

---

## 2. Proposed Layer Architecture

```
┌─────────────────────────────────────────────────────────┐
│               React Frontend (japz-web)                 │
│  PayrollPage → displays backend-calculated values only  │
│  api.ts → payrollAPI object with Axios calls            │
└───────────────────────────┬─────────────────────────────┘
                            │ HTTP (JWT Bearer)
┌───────────────────────────▼─────────────────────────────┐
│             Express Router (routes/index.js)             │
│  /api/payroll/*  →  verifyToken  →  requireAdmin         │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│               PayrollController                          │
│  (japz-backend/controllers/payrollController.js)         │
│  - Reads req.body / req.params                           │
│  - Calls PayrollService                                  │
│  - Returns standardized JSON response                    │
│  - NO calculation logic here                             │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│               PayrollService                             │
│  (japz-backend/services/payrollService.js)               │
│  - Orchestrates the payroll workflow                     │
│  - Fetches employees, attendance, payroll period         │
│  - Calls PayrollCalculator for each employee             │
│  - Persists results using Sequelize transactions         │
│  - Calls createLog() for audit trail                     │
└─────────────┬─────────────────────────┬─────────────────┘
              │                         │
┌─────────────▼────────────┐ ┌──────────▼──────────────────┐
│    PayrollCalculator     │ │    AttendanceService         │
│  (services/payrollCalc.. │ │  (services/attendance..js)   │
│  - Pure function         │ │  - Clock in / out logic      │
│  - No DB calls           │ │  - Validation (missing punch)│
│  - No side effects       │ │  - Returns validated data    │
│  - Takes snapshot input  │ │                              │
│  - Returns result object │ │                              │
└──────────────────────────┘ └──────────────────────────────┘
              │
┌─────────────▼────────────────────────────────────────────┐
│              Sequelize Models (models/)                   │
│  Employee, Attendance, PayrollPeriod, PayrollEntry,       │
│  Payslip, PayrollAdjustment                              │
└──────────────────────────────────────────────────────────┘
```

---

## 3. PayrollCalculator — Design Specification

The `PayrollCalculator` is the heart of the payroll module. It must be:
- **Pure:** Same inputs always produce same outputs.
- **Isolated:** Zero database calls. Zero side effects.
- **Testable:** Can be imported and called in unit tests without mocking the database.

### Function Signature (Conceptual)
```javascript
// japz-backend/services/payrollCalculator.js

export const calculatePayrollEntry = (
  employeeSnapshot,   // { hourlyRate, name, role }
  payrollPeriod,      // { periodStart, periodEnd }
  validatedAttendance,// Array of { date, clockIn, clockOut, totalHours, lateMinutes, undertimeMinutes }
  payrollRules        // { regularHoursPerDay, overtimeMultiplier, gracePeriodMinutes, ... }
) => {
  // Returns a structured result object — no DB calls
  return {
    snapshotHourlyRate: ...,
    regularHours: ...,
    overtimeHours: ...,
    basicPay: ...,
    overtimePay: ...,
    holidayPay: ...,
    restDayPay: ...,
    allowances: ...,
    bonuses: ...,
    grossPay: ...,
    lateMinutes: ...,
    undertimeMinutes: ...,
    absenceDays: ...,
    lateDeduction: ...,
    undertimeDeduction: ...,
    absenceDeduction: ...,
    cashAdvanceDeduction: ...,
    otherDeductions: ...,
    totalDeductions: ...,
    netPay: ...,
  };
};
```

### Rules for PayrollCalculator
1. It must import and use the `roundMoney` utility for all monetary values.
2. It must never call any Sequelize model directly.
3. It must never call `createLog()`.
4. It must never read from `process.env` for business logic.
5. It must be fully covered by unit tests.

---

## 4. AttendanceService — Design Specification

```javascript
// japz-backend/services/attendanceService.js

// Clock in an employee
export const clockIn = async (employeeId, date) => { ... };

// Clock out an employee
export const clockOut = async (employeeId, clockOutTime) => { ... };

// Get validated attendance for a period (returns only complete records)
export const getValidatedAttendance = async (employeeId, startDate, endDate) => { ... };

// Get attendance validation report (flags missing punches, duplicates)
export const getAttendanceValidationReport = async (periodStart, periodEnd) => { ... };
```

---

## 5. PayrollService — Design Specification

```javascript
// japz-backend/services/payrollService.js

// Generate a new payroll period
export const createPayrollPeriod = async (periodStart, periodEnd, createdByUserId) => { ... };

// Run calculation for all eligible employees in a period
export const calculatePayroll = async (payrollPeriodId, calculatedByUserId) => { ... };

// Approve a payroll period
export const approvePayroll = async (payrollPeriodId, approvedByUserId) => { ... };

// Mark payroll as paid
export const markPayrollPaid = async (payrollPeriodId, markedByUserId) => { ... };

// Reopen a payroll period (APPROVED → UNDER_REVIEW)
export const reopenPayroll = async (payrollPeriodId, userId, reason) => { ... };
```

All multi-step database writes inside `PayrollService` must use Sequelize transactions:
```javascript
const t = await sequelize.transaction();
try {
  // ... multiple DB operations
  await t.commit();
} catch (error) {
  await t.rollback();
  throw error;
}
```

---

## 6. PayrollController — Design Specification

```javascript
// japz-backend/controllers/payrollController.js

// Thin controller — only request/response handling
export const createPeriod = async (req, res) => {
  try {
    const result = await payrollService.createPayrollPeriod(...);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('createPeriod error:', error);
    res.status(500).json({ success: false, message: 'Failed to create payroll period' });
  }
};
```

---

## 7. Frontend Architecture

All payroll pages go under `japz-web/src/pages/admin/payroll/`:
```
pages/admin/payroll/
├── PayrollDashboard.tsx    ← Overview of periods
├── PayrollPeriodDetail.tsx ← Per-period review and approval
├── AttendanceManagement.tsx
├── EmployeePayslip.tsx     ← Single payslip view
└── PayrollReports.tsx      ← Summary and analytics
```

All payroll API calls go through a dedicated section in `services/api.ts`:
```typescript
export const payrollAPI = {
  createPeriod: (data) => api.post('/api/payroll/periods', data),
  calculatePayroll: (periodId) => api.post(`/api/payroll/periods/${periodId}/calculate`),
  getPeriods: () => api.get('/api/payroll/periods'),
  approvePeriod: (periodId) => api.put(`/api/payroll/periods/${periodId}/approve`),
  // ...etc
};
```

**The frontend must never calculate payroll values.** It displays what the backend returns.
