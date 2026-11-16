# DEFINITION_OF_DONE.md — Payroll Feature Completion Criteria

> **Status:** Foundation Documentation
> **Last Updated:** 2026-10-06
> A payroll feature is NOT complete simply because the UI displays correctly or the happy path works.

---

## Mandatory Completion Checklist

Before any payroll feature is considered **Done**, the following must all be true. Items marked (if applicable) may be skipped only if they genuinely do not apply to the specific feature.

### Backend

- [ ] **Database migration/schema updated** — All new tables and columns are defined in Sequelize models and reflected in the migration.
- [ ] **Model relationships defined** — All `hasMany`, `belongsTo`, etc. associations are correctly set up in `models/index.js`.
- [ ] **Input validation implemented** — Request body and params are validated. Required fields return 400 if missing. Invalid types are rejected.
- [ ] **Backend authorization enforced** — All new API endpoints use `verifyToken` and `requireAdmin` (or appropriate role check). Authorization is not frontend-only.
- [ ] **Business rules implemented in service layer** — Payroll rules live in `PayrollService` or `PayrollCalculator`. No business logic in the controller or route handler.
- [ ] **Payroll formulas centralized** — No calculation is duplicated. All formulas reference `PAYROLL_FORMULAS.md` and live in `payrollCalculator.js`.
- [ ] **Database transactions used** — Any operation that writes to multiple tables uses a Sequelize transaction with rollback on failure.
- [ ] **Audit logging added (if applicable)** — All sensitive actions (salary change, attendance correction, payroll approval, etc.) are logged via `createLog()`.
- [ ] **Error handling complete** — All async functions have `try/catch`. Errors return a standardized `{ success: false, message: "..." }` response. The server does not crash.
- [ ] **No console.error left unhandled** — `console.error` is used to log server-side errors, but a proper JSON error response is always returned to the client.

### Payroll Integrity

- [ ] **Historical snapshots preserved** — Any new payroll entry stores the employee's rate and relevant data as a snapshot at calculation time.
- [ ] **Immutability enforced** — APPROVED/PAID/LOCKED entries cannot be modified by the new feature.
- [ ] **Status transitions validated** — The feature only allows valid transitions as defined in `PAYROLL_WORKFLOW.md`.
- [ ] **Duplicate prevention** — The feature does not allow duplicate payroll periods or duplicate payroll entries for the same employee and period.

### Financial Calculations

- [ ] **`roundMoney()` applied** — All monetary calculations use the rounding utility before storage.
- [ ] **Decimal hours used** — All time-to-money conversions use decimal hours (8.5, not "8:30").
- [ ] **Net pay capped at 0** — The feature never stores a negative net pay value.
- [ ] **Calculations verified** — The Golden Scenarios from `TESTING_PLAN.md` produce correct results.

### Testing

- [ ] **Unit tests written for new formulas** — Every new calculation path in `PayrollCalculator` has a unit test.
- [ ] **Integration tests written (if applicable)** — New API routes have at least a basic integration test covering the happy path and an auth/permission test.
- [ ] **Existing tests still pass** — Running the full test suite produces no new failures.
- [ ] **Regression test added for any bug fix** — If the feature fixes a bug, a test that would have caught the bug is added.

### Frontend

- [ ] **UI implemented** — The feature has a user-facing view or interaction.
- [ ] **Loading state handled** — Buttons show loading state while API calls are in progress.
- [ ] **Error state handled** — API errors are displayed to the user in a clear, non-technical message.
- [ ] **Empty state handled** — Lists or tables show a meaningful empty state (not a blank screen).
- [ ] **UI uses backend-calculated values** — The frontend does not independently calculate payroll amounts.
- [ ] **TypeScript types defined** — New API response shapes have corresponding TypeScript interfaces.

### Code Quality

- [ ] **No linting errors** — `npm run lint` in `japz-web` passes without errors.
- [ ] **TypeScript build passes** — `tsc -b` in `japz-web` passes without errors.
- [ ] **No unrelated code changed** — The PR/commit only modifies files relevant to this feature.
- [ ] **No new technical debt added without documentation** — Any shortcuts or known issues are documented in `TECH_DEBT.md`.

### Documentation

- [ ] **`CURRENT_TASK.md` marked complete** — The task document reflects what was done.
- [ ] **`PAYROLL_FORMULAS.md` updated (if formulas changed)** — Any new or modified formula is reflected in the central formulas document.
- [ ] **`DATABASE_SCHEMA.md` updated (if schema changed)** — New tables/columns are documented.
- [ ] **`DECISIONS.md` updated (if architectural decisions were made)** — Major decisions are recorded as ADRs.
