# AI_AGENT_RULES.md — Antigravity Coding Agent Protocol for JAPZ Payroll

> **Status:** Active — These rules govern all AI-assisted development on this payroll module.
> **Last Updated:** 2026-10-06
> **Read this file before writing a single line of code.**

---

## Before Implementing Any Feature

Before writing or modifying any code, the agent MUST complete these steps:

1. **Read `PROJECT_CONTEXT.md`** — Understand the tech stack, architectural patterns, roles, and non-negotiable principles.
2. **Read `CURRENT_TASK.md`** — Understand the specific feature being built right now.
3. **Read the relevant domain documents:**
   - `PAYROLL_RULES.md` for business rules.
   - `PAYROLL_FORMULAS.md` if the task involves any calculation.
   - `ATTENDANCE_RULES.md` if the task touches attendance.
   - `PAYROLL_WORKFLOW.md` if the task involves status transitions.
   - `PAYROLL_PERMISSIONS.md` if the task involves access control.
4. **Inspect the existing implementation** before creating new files. Search for reusable code in `services/`, `controllers/`, `utils/`, and `models/`.
5. **Identify all files that will be affected** before making any changes.
6. **Identify database impact** — Does this require a new model, a new column, or a migration?
7. **Identify permission/security impact** — Does this expose sensitive data? Does it need authorization middleware?
8. **Identify payroll calculation impact** — Does this touch any formula in `PAYROLL_FORMULAS.md`?
9. **Identify possible regressions** — What existing functionality could this break?

---

## Before Editing Code

Before making any edit, explain clearly:

- **What** will be changed and in which files.
- **Why** it is necessary for the current task.
- **Which existing patterns** will be reused (e.g., "I will follow the same controller pattern as `authController.js`").
- **Which files** are expected to change.
- **Whether a database migration** is required.
- **Whether payroll formulas** are affected.

Do not skip this step. Unexplained edits to financial code are not acceptable.

---

## During Implementation — Required Rules

### Scope
- Work **only** on what `CURRENT_TASK.md` describes.
- Do **not** implement features that are out of scope for the current task.
- Do **not** refactor unrelated code while implementing a feature.
- Do **not** rename established database fields without a migration plan.
- Do **not** replace working libraries with new ones without a documented decision in `DECISIONS.md`.

### Architecture
- Follow the layered architecture in `PAYROLL_ARCHITECTURE.md`.
  - Route → verifyToken → requireAdmin → Controller → Service → Calculator → Models
- Payroll calculation logic **must** go into `services/payrollCalculator.js`.
- Do **not** put calculation logic in controllers, routes, or React components.
- Reuse `utils/logger.js` (`createLog`) for all audit logging. Do not create a second logging system.
- Reuse `services/api.ts` (`payrollAPI` object) on the frontend. Do not create a second API file.

### Database
- Do **not** use `sequelize.sync({ force: true })` in any service or controller.
- Use `sequelize.transaction()` for any operation that writes to multiple tables.
- Do **not** query `Employee.hourlyRate` to reconstruct historical payroll — use the snapshot fields.
- Before creating a new model or field, check `DATABASE_SCHEMA.md` and inspect existing models.

### Financial Calculations
- Apply `roundMoney()` to every monetary value before storage and before returning in API responses.
- Use decimal hours for all time calculations. Never use "HH:MM" strings in arithmetic.
- Net pay must never be stored as a negative value. Cap at 0.
- Never modify a formula in `payrollCalculator.js` without also updating `PAYROLL_FORMULAS.md`.

### Security
- Apply `verifyToken` and `requireAdmin` middleware to all new payroll routes.
- Never pass `req.body` directly into a Sequelize create/update.
- Log all sensitive actions via `createLog()`.
- Never expose `hourlyRate` or payroll data to non-admin API consumers.

### Code Quality
- All async controller functions must use `try/catch` with a standardized error response.
- No `console.error` without a corresponding error response to the client.
- Follow naming conventions in `CODING_STANDARDS.md`.
- Add TypeScript interfaces for all new API response shapes.

---

## After Implementation — Required Checklist

### Tests
Run (when applicable):
- [ ] Unit tests for any new `PayrollCalculator` logic
- [ ] Integration tests for new API routes
- [ ] Full test suite (when available)

### Self-Review
Perform a self-review for:
- [ ] **Calculation bugs** — Do the numbers add up correctly against `PAYROLL_FORMULAS.md`?
- [ ] **Permission vulnerabilities** — Can a non-admin access this endpoint?
- [ ] **Missing validation** — What happens if required fields are missing?
- [ ] **Duplicate records** — Can this create duplicate payroll entries?
- [ ] **Race conditions** — What happens if two admins click "approve" simultaneously?
- [ ] **Historical payroll corruption** — Does this change any finalized payroll values?
- [ ] **Incorrect workflow transitions** — Does this allow an invalid status change?
- [ ] **UI/backend inconsistency** — Does the frontend display what the backend actually calculated?

### Final Report
Provide a brief summary including:
- **Files changed** (list each file)
- **Features completed** (what was built)
- **Tests added** (test IDs and descriptions)
- **Tests executed** (pass/fail summary)
- **Known limitations** (what is not handled yet)
- **Remaining TODO items** (what is deferred to a future task)

---

## Stability Rule

Working functionality has higher priority than architectural perfection.

**Never:**
- Rewrite a working module because a different approach seems cleaner.
- Rename established database fields without a migration plan and team discussion.
- Break existing APIs that cashier or kitchen staff depend on.
- Change model relationships casually.
- Replace working npm packages with alternatives unless there is a critical reason.
- Perform unrelated code cleanup while implementing a payroll feature.

If technical debt is discovered during implementation: **stop, add it to `TECH_DEBT.md`, and continue with the current task.**

---

## Payroll Formula Safety Rule

Every payroll formula is financial business logic. Handle with care.

If a requested feature requires **changing** an existing formula in `payrollCalculator.js`:

1. First, identify which formula is affected and cite it from `PAYROLL_FORMULAS.md`.
2. Explain the **existing behavior** in plain language.
3. Explain the **proposed new behavior** and why it is needed.
4. Identify which existing `PayrollEntry` records (DRAFT, CALCULATED, etc.) might be affected.
5. Update the unit tests for the changed formula.
6. Update `PAYROLL_FORMULAS.md` to reflect the new formula.
7. Only then implement the code change.

**Do not change a payroll formula merely because the code would be simpler.**

---

## Historical Integrity Rule

Once a payroll period reaches `APPROVED`, `PAID`, or `LOCKED`:

- Its stored financial values (grossPay, netPay, deductions, etc.) must remain unchanged.
- Employee salary changes after this point must not alter historical entries.
- Employee position changes must not rewrite historical entries.
- Attendance corrections must not silently recalculate locked entries.
- All corrections must go through controlled adjustment/reopen processes.
- Every change must be logged.

**Any code that violates this rule is a critical bug.**

---

## Database Safety Rule

Before creating any database migration or calling `sync()`:

- Inspect existing tables. Check if the field or table already exists.
- Verify the existing `models/index.js` associations won't conflict.
- Consider the impact on existing data.
- Consider rollback: if the migration fails halfway, what is the state?
- Add appropriate indexes and unique constraints.

**Never truncate, drop, or recreate tables in production or without explicit instruction.**

---

## Development Order

When uncertain about what to build next, follow this priority order:

1. Fix `TECH_DEBT.md` items marked 🔴 Critical/High that block the current feature.
2. Build backend (models → service → calculator → controller → routes) before frontend.
3. Build and test `PayrollCalculator` unit tests before building any UI.
4. Build and test backend API before connecting the frontend.
5. Build the admin payroll dashboard and management UI last.
6. Build reports and export features after core functionality is stable.
7. Build employee self-service (view own payslip) last.
