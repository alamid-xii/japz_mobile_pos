# CURRENT_TASK.md — Active Development Task

> **Purpose:** One feature at a time. Update this file at the start of every new development task.
> **Template Version:** 1.0
> **Last Updated:** 2026-10-06

---

# Current Task

## Feature
*(Replace with the feature name, e.g., "Payroll Period Creation")*

## Goal
*(One sentence: What does this task accomplish for the user?)*

## Background
*(Why is this feature needed? What was the state before this feature?)*

## Requirements
*(Functional requirements — what must the system do?)*
- [ ] Requirement 1
- [ ] Requirement 2

## Business Rules
*(Specific payroll/attendance rules that govern this feature. Reference PAYROLL_RULES.md.)*
- Rule 1
- Rule 2

## Permissions
*(Who can trigger this feature? Reference PAYROLL_PERMISSIONS.md.)*
- Admin: ✅ Allowed
- Cashier: ❌ Blocked
- Kitchen: ❌ Blocked
- Employee self-service: TBD

## Inputs
*(What data does this feature receive?)*
- `fieldName` (type) — description

## Outputs
*(What does this feature return or produce?)*
- Success response: `{ success: true, data: { ... } }`
- Error response: `{ success: false, message: "..." }`

## Files Likely Affected

### Backend
- `models/` — New or modified Sequelize model
- `services/payrollService.js` — Service logic
- `services/payrollCalculator.js` — If formulas are involved
- `controllers/payrollController.js` — Controller method
- `routes/index.js` — New route registration

### Frontend
- `pages/admin/payroll/FeaturePage.tsx` — New page
- `services/api.ts` — New API function

## Database Impact
*(Does this feature require a migration? New table? New column?)*
- [ ] No database changes required
- [ ] New model: `ModelName`
- [ ] New column on existing model: `Table.columnName`
- [ ] Migration required: run `npm run migrate`

## Security Impact
- [ ] New API endpoint requires `verifyToken`
- [ ] New API endpoint requires `requireAdmin`
- [ ] Sensitive data (salary, payslip) is involved — extra care needed
- [ ] Audit log entry required

## Edge Cases
*(List relevant edge cases from EDGE_CASES.md.)*
- EC-XX: Description — how this feature handles it

## Acceptance Criteria
*(When is this task truly done? Be specific.)*
- [ ] Given X, when Y, then Z
- [ ] Given X, when Y, then Z

## Tests Required
*(Reference TESTING_PLAN.md for test IDs.)*
- [ ] Unit Test: UT-XX — description
- [ ] Feature Test: FT-XX — description

## Out of Scope
*(What will NOT be built in this task to avoid scope creep?)*
- Not included: Feature X (will be done in next task)

## Completion Checklist
*(Copy from DEFINITION_OF_DONE.md and check off as you go)*
- [ ] DB migration/schema done
- [ ] Model relationships done
- [ ] Input validation implemented
- [ ] Backend auth enforced
- [ ] Business logic in service layer
- [ ] Payroll formulas centralized
- [ ] Transactions used
- [ ] Audit logging added (if required)
- [ ] Error handling complete
- [ ] Historical snapshots preserved (if applicable)
- [ ] Immutability enforced (if applicable)
- [ ] `roundMoney()` applied to all monetary values
- [ ] Net pay capped at 0
- [ ] Unit tests written
- [ ] Integration tests written
- [ ] Existing tests pass
- [ ] UI implemented
- [ ] Loading, error, empty states handled
- [ ] Frontend uses backend-calculated values only
- [ ] TypeScript types defined
- [ ] No linting errors
- [ ] TypeScript build passes
- [ ] `CURRENT_TASK.md` updated
- [ ] Relevant docs updated (`PAYROLL_FORMULAS.md`, `DATABASE_SCHEMA.md`, `DECISIONS.md`)
