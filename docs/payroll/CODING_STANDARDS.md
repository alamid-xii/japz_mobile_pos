# CODING_STANDARDS.md — JAPZ Payroll Coding Conventions

> **Status:** Foundation Documentation
> **Last Updated:** 2026-10-06
> Based on inspection of the actual JAPZ codebase.

---

## 1. Observed Project Conventions

### File Naming
| Type | Convention | Examples |
|---|---|---|
| Models | `camelCase` + `Model.js` | `employeeModel.js`, `payrollModel.js` |
| Controllers | `camelCase` + `Controller.js` | `authController.js`, `payrollController.js` |
| Services | `camelCase` + `Service.js` | `emailService.js`, `payrollService.js` |
| Utils | `camelCase` + `.js` | `logger.js` |
| Frontend Pages | `PascalCase` + `.tsx` | `Employees.tsx`, `PayrollDashboard.tsx` |
| Frontend Components | `PascalCase` + `.tsx` | `ProtectedRoute.tsx` |
| Frontend Hooks | `camelCase` + `.tsx` | `useAuth.tsx` |
| Frontend API Service | `camelCase` + `.ts` | `api.ts` |

### Function Naming
- **Controllers:** Verb + noun (`loginUser`, `createPeriod`, `approvePayroll`)
- **Services:** Verb + noun (`calculatePayroll`, `clockIn`, `generatePayslip`)
- **React components:** PascalCase (`PayrollDashboard`)
- **React hooks:** `use` prefix (`useAuth`, `usePayroll`)
- **Helper utilities:** Verb + noun (`roundMoney`, `toDecimalHours`, `createLog`)

### Database / Model Naming
- Table names: Sequelize pluralizes model names automatically (`Employee` → `Employees`)
- Column names: `camelCase` in Sequelize (`periodStart`, `totalHours`, `netPay`)
- Foreign keys: `entityId` pattern (`employeeId`, `payrollPeriodId`, `createdBy`)
- ENUM values: Existing models use mixed casing — payroll will use `UPPER_CASE` for status values to distinguish them clearly (`DRAFT`, `APPROVED`, `PAID`)

### API Route Conventions
All payroll API routes must follow this prefix: `/api/payroll/`

| Method | Path | Action |
|---|---|---|
| GET | `/api/payroll/periods` | List all periods |
| POST | `/api/payroll/periods` | Create a period |
| GET | `/api/payroll/periods/:id` | Get period details |
| POST | `/api/payroll/periods/:id/calculate` | Run calculation |
| PUT | `/api/payroll/periods/:id/approve` | Approve period |
| PUT | `/api/payroll/periods/:id/paid` | Mark as paid |
| PUT | `/api/payroll/periods/:id/lock` | Lock period |
| PUT | `/api/payroll/periods/:id/reopen` | Reopen period |
| GET | `/api/payroll/entries/:id` | Get one entry |
| POST | `/api/payroll/entries/:id/adjust` | Add adjustment |
| GET | `/api/payroll/payslips/:id` | Get payslip |
| GET | `/api/attendance` | List attendance |
| POST | `/api/attendance/clock-in` | Clock in |
| PUT | `/api/attendance/:id/clock-out` | Clock out |
| PUT | `/api/attendance/:id` | Admin correction |

### API Response Format (Standard — Required for All New Routes)
```javascript
// Success
res.status(200).json({ success: true, data: result, message: 'Optional' });

// Created
res.status(201).json({ success: true, data: created });

// Client Error
res.status(400).json({ success: false, message: 'Validation message' });

// Unauthorized
res.status(401).json({ success: false, message: 'Authentication required' });

// Forbidden
res.status(403).json({ success: false, message: 'Insufficient permissions' });

// Not Found
res.status(404).json({ success: false, message: 'Resource not found' });

// Server Error
res.status(500).json({ success: false, message: 'Internal server error' });
```

### Error Handling Pattern
```javascript
export const myController = async (req, res) => {
  try {
    const result = await myService.doSomething(req.body);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('myController error:', error);
    res.status(500).json({ success: false, message: 'Operation failed' });
  }
};
```

### Logging Pattern (Verified `createLog` signature from `utils/logger.js`)
```javascript
import { createLog, getClientIp } from '../utils/logger.js';

// Correct: createLog takes a SINGLE OBJECT argument
await createLog({
  action: 'OTHER',          // Log.action ENUM value — use 'OTHER' until payroll ENUMs added
  module: 'payroll',        // Module name string
  userId: req.user.id,
  userName: req.user.name,
  entityId: payrollPeriod.id,
  entityType: 'PayrollPeriod',
  description: 'Admin approved payroll period for October 2026',
  changes: { from: 'UNDER_REVIEW', to: 'APPROVED' }, // JSON before/after
  ipAddress: getClientIp(req),
  status: 'success'         // 'success' | 'failed' | 'pending'
});
// NOTE: createLog never throws — logging failures are swallowed internally.
// Do NOT await it inside a transaction — log AFTER the transaction commits.
```

### `requireAdmin` Middleware (Must Create — Does NOT Exist Yet)
```javascript
// This middleware does NOT exist in the codebase yet. We must create it.
// Current codebase does inline role checks. We will create a proper middleware.
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Forbidden: Admin access required' });
  }
  next();
};
// Apply to all payroll routes:
router.use('/api/payroll', verifyToken, requireAdmin);
```
```

### Component Structure (Frontend)
```typescript
// Standard React component structure
import { useState, useEffect } from 'react';
import { payrollAPI } from '../../services/api';

interface PayrollPeriod {
  id: number;
  periodStart: string;
  periodEnd: string;
  status: string;
}

export default function PayrollDashboard() {
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPeriods = async () => {
      try {
        const res = await payrollAPI.getPeriods();
        setPeriods(res.data.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load payroll periods');
      } finally {
        setLoading(false);
      }
    };
    fetchPeriods();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-rose-600">{error}</div>;
  if (periods.length === 0) return <div>No payroll periods found.</div>;

  return ( /* JSX */ );
}
```

---

## 2. Payroll-Specific Rules

### CRITICAL — Never Duplicate Payroll Formulas
All calculation logic must live exclusively in `services/payrollCalculator.js`. If a formula appears in more than one file, it is a bug.

### CRITICAL — Never Calculate Authoritative Payroll in the Frontend
The React UI may display previews for UX purposes, but:
- Payslips must show values returned from the backend API.
- Totals displayed to admins must come from the backend.
- Never display a frontend-calculated value as if it were an official payslip amount.

### CRITICAL — Never Use Current Employee Data to Reconstruct Historical Payroll
If you need to display an old payroll entry, use the snapshot fields stored in `PayrollEntries` (`snapshotHourlyRate`, `snapshotEmployeeName`). Never query `Employee.hourlyRate` to show a historical payroll amount.

### CRITICAL — Never Silently Ignore Payroll Failures
If payroll calculation fails for one employee, it must not silently skip and continue. Fail explicitly, log the error, rollback the transaction, and return an error response.

### Use Database Transactions for Multi-Step Persistence
Any operation that writes to more than one table must use a Sequelize transaction. Do not perform sequential `await Model.create()` calls without a transaction wrapper.

### Prevent Duplicate Payroll Entries
Before creating a PayrollEntry, always check: does an entry already exist for this `(employeeId, payrollPeriodId)` combination? If yes, either update or throw an error depending on context.

### Prefer Idempotent Payroll Operations
Where possible, payroll generation should be idempotent: running it twice on a DRAFT period should produce the same result, not duplicate entries.
