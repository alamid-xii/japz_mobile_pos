# PAYROLL_PERMISSIONS.md — Role & Permission Matrix

> **Status:** Foundation Documentation
> **Last Updated:** 2026-10-06
> **Related Documents:** [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md), [SECURITY_RULES.md](./SECURITY_RULES.md)

---

## 1. Existing JAPZ Roles (from codebase inspection)

| Role | Description | User Status Values |
|---|---|---|
| `admin` | Full system access. Manages employees, menu, payroll. | `approved` |
| `cashier` | POS and order management only. | `approved` |
| `kitchen` | Kitchen order viewing only. | `approved` |
| *(employee self-service)* | TBD — currently employees do not have a separate login. May reuse `cashier`/`kitchen` account. | TBD |

> **Note:** There is no dedicated `manager` or `hr` role in the existing codebase. The `admin` role handles all administrative functions, including payroll. If a more granular role is needed (e.g., `payroll_admin`), it must be added to the `User` model's `role` ENUM and documented as an architecture decision in [DECISIONS.md](./DECISIONS.md).

---

## 2. Permission Definitions

| Permission ID | Permission Name | Description |
|---|---|---|
| P01 | `view_employees` | View the list and details of employees |
| P02 | `edit_employee_salary` | Edit an employee's hourly rate or compensation |
| P03 | `view_attendance` | View attendance records for any employee |
| P04 | `correct_attendance` | Manually edit or create attendance records |
| P05 | `create_payroll_period` | Open a new payroll period |
| P06 | `calculate_payroll` | Trigger the payroll calculation run |
| P07 | `recalculate_payroll` | Re-run payroll calculation (only before APPROVED) |
| P08 | `add_payroll_adjustment` | Add a manual adjustment to a payroll entry |
| P09 | `review_payroll` | View and review calculated payroll entries |
| P10 | `approve_payroll` | Approve a payroll period |
| P11 | `mark_payroll_paid` | Mark a payroll period as paid/disbursed |
| P12 | `lock_payroll` | Lock a payroll period permanently |
| P13 | `reopen_payroll` | Reopen an approved payroll for correction |
| P14 | `cancel_payroll` | Cancel a payroll period |
| P15 | `view_payslips_all` | View payslips for all employees |
| P16 | `view_own_payslip` | View only one's own payslip |
| P17 | `view_payroll_reports` | View payroll summary and analytics reports |
| P18 | `export_payroll_data` | Export payroll data (CSV, PDF) |

---

## 3. Role × Permission Matrix

| Permission | `admin` | `cashier` | `kitchen` | Employee Self-Service (TBD) |
|---|---|---|---|---|
| P01 view_employees | ✅ | ❌ | ❌ | ❌ |
| P02 edit_employee_salary | ✅ | ❌ | ❌ | ❌ |
| P03 view_attendance | ✅ | ❌ | ❌ | Own only (TBD) |
| P04 correct_attendance | ✅ | ❌ | ❌ | ❌ |
| P05 create_payroll_period | ✅ | ❌ | ❌ | ❌ |
| P06 calculate_payroll | ✅ | ❌ | ❌ | ❌ |
| P07 recalculate_payroll | ✅ | ❌ | ❌ | ❌ |
| P08 add_payroll_adjustment | ✅ | ❌ | ❌ | ❌ |
| P09 review_payroll | ✅ | ❌ | ❌ | ❌ |
| P10 approve_payroll | ✅ | ❌ | ❌ | ❌ |
| P11 mark_payroll_paid | ✅ | ❌ | ❌ | ❌ |
| P12 lock_payroll | ✅ | ❌ | ❌ | ❌ |
| P13 reopen_payroll | ✅ | ❌ | ❌ | ❌ |
| P14 cancel_payroll | ✅ | ❌ | ❌ | ❌ |
| P15 view_payslips_all | ✅ | ❌ | ❌ | ❌ |
| P16 view_own_payslip | ✅ | TBD | TBD | TBD |
| P17 view_payroll_reports | ✅ | ❌ | ❌ | ❌ |
| P18 export_payroll_data | ✅ | ❌ | ❌ | ❌ |

---

## 4. Backend Authorization Rule

> **Frontend hiding is not authorization.**

Every payroll API endpoint must independently verify permissions server-side using the decoded JWT token's `role` field. An example guard:

```javascript
// Middleware pattern — apply to all payroll routes
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  next();
};
```

Do not assume that because the frontend hides a button, the API cannot be called directly. Always enforce authorization on the backend.

---

## 5. TBD Decisions

- [ ] Should employees have a self-service portal to view their own payslip? If yes, which login role do they use?
- [ ] Should a separate `payroll_admin` role be created for someone who manages payroll but not the full system?
- [ ] Should `cashier` or `kitchen` role users be able to view their own attendance records?
