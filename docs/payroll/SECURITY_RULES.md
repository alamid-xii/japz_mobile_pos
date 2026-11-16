# SECURITY_RULES.md — Payroll Security Requirements

> **Status:** Foundation Documentation
> **Last Updated:** 2026-10-06
> **Related Documents:** [PAYROLL_PERMISSIONS.md](./PAYROLL_PERMISSIONS.md), [CODING_STANDARDS.md](./CODING_STANDARDS.md)

---

## 1. Authentication

- All payroll API endpoints require a valid JWT token (`Authorization: Bearer <token>`).
- The `verifyToken` middleware (already in `routes/index.js`) must be applied to all `/api/payroll/*` routes.
- A missing, expired, or malformed token returns `401 Unauthorized`.

## 2. Authorization (Role Enforcement)

- After verifying the token, all payroll write operations must additionally verify `req.user.role === 'admin'`.
- Read operations (viewing payslips) may be extended to employees in the future, but must still verify token and `employeeId` ownership.
- **Frontend hiding is not authorization.** API endpoints are independently secured.

```javascript
// Required on all payroll routes
router.use('/api/payroll', verifyToken, requireAdmin);
```

## 3. Principle of Least Privilege

- `cashier` and `kitchen` roles must not be able to access any payroll data through the API.
- Employees (if given self-service access in the future) may only view their own payslip. The backend must enforce `req.user.id` matches the employee's linked user account.

## 4. Sensitive Salary Information

- Employee hourly rates and payroll figures are sensitive. They must only be returned to `admin`-role users in API responses.
- Do not include `hourlyRate` in general employee listing endpoints that cashiers or kitchen staff might access.
- Do not log salary figures in server console output.

## 5. Payslip Privacy

- Payslips contain financial and personal information. Access is restricted.
- Admin: can view all payslips.
- Employee (TBD): can only view their own payslip, verified server-side.
- Do not expose payslip URLs that are guessable by incrementing an ID without authentication.

## 6. Audit Trail

The following actions must be logged via `createLog()` for auditability. No exceptions.

| Action | `action` ENUM value | Priority |
|---|---|---|
| Employee hourly rate changed | `UPDATE_EMPLOYEE` | 🔴 High |
| Attendance record created manually | `OTHER` (until ENUM expanded) | 🔴 High |
| Attendance record corrected | `OTHER` | 🔴 High |
| Payroll period created | `OTHER` | 🟡 Medium |
| Payroll calculation run | `OTHER` | 🟡 Medium |
| Payroll recalculated | `OTHER` | 🔴 High |
| Manual adjustment added | `OTHER` | 🔴 High |
| Payroll approved | `OTHER` | 🔴 High |
| Payroll marked as paid | `OTHER` | 🔴 High |
| Payroll reopened | `OTHER` | 🔴 High |
| Payroll cancelled | `OTHER` | 🔴 High |
| Payroll locked | `OTHER` | 🟡 Medium |

> **Note:** New `action` ENUM values must be added to `logModel.js` when the payroll module is implemented (e.g., `PAYROLL_CALCULATED`, `PAYROLL_APPROVED`, etc.).

## 7. Input Validation

- All request bodies must be validated before reaching any service or database.
- Date fields: must be valid ISO date strings. Reject malformed dates.
- Numeric fields: must be positive numbers. Reject negative rates or hours.
- String fields: trim whitespace. Enforce max lengths.
- `employeeId` and `payrollPeriodId` must exist in the database (validated in the service, not just trusted from the request).

## 8. Mass Assignment Protection

- Never pass `req.body` directly into a Sequelize `create()` or `update()` call.
- Always explicitly pick the allowed fields:
```javascript
// BAD — mass assignment vulnerability
await PayrollEntry.create(req.body);

// GOOD — explicit fields only
await PayrollEntry.create({
  payrollPeriodId: req.body.payrollPeriodId,
  employeeId: req.body.employeeId,
  // ... only allowed fields
});
```

## 9. Secure Data Export

- Payroll exports (CSV, PDF) must require admin authentication.
- Export endpoints must not be publicly accessible or cacheable.
- Consider adding rate limiting to export endpoints to prevent data harvesting.

## 10. What NOT to Log

- Do not log JWT tokens.
- Do not log passwords (even hashed).
- Do not log raw database credentials.
- Do not log full request bodies that may contain password fields.
