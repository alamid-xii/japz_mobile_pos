# DECISIONS.md — Architecture Decision Records

> **Purpose:** Record important architectural decisions so future contributors understand why things were built a certain way.
> **Last Updated:** 2026-10-06

---

## ADR Template

```
### ADR-XXX: [Decision Title]
| Field | Value |
| Date | YYYY-MM-DD |
| Status | PROPOSED / ACCEPTED / DEPRECATED / SUPERSEDED |
| Deciders | [Names or roles] |

#### Context
[Why did this decision need to be made?]

#### Decision
[What was decided?]

#### Reason
[Why was this chosen over alternatives?]

#### Consequences
[What are the trade-offs and downstream effects?]
```

---

## Decisions

### ADR-001: Payroll calculations are performed exclusively on the backend

| Field | Value |
|---|---|
| **Date** | 2026-10-06 |
| **Status** | ACCEPTED |
| **Deciders** | Payroll module developer |

#### Context
There was a choice between calculating payroll values in the frontend for a faster UX or calculating them only on the backend.

#### Decision
All authoritative payroll calculations must be performed by the `PayrollCalculator` service on the backend. The frontend only displays values returned by the API.

#### Reason
Frontend calculations are not trustworthy as a financial record. They can be manipulated, they will drift from backend logic over time, and they cannot be audited. Payroll figures must be deterministic and server-authoritative.

#### Consequences
- Slight UX overhead (API call required to see final amounts).
- Frontend cannot show a "live preview" payslip without an API call.
- Backend is the single source of truth — no synchronization bugs.

---

### ADR-002: Finalized payroll entries store compensation snapshots

| Field | Value |
|---|---|
| **Date** | 2026-10-06 |
| **Status** | ACCEPTED |
| **Deciders** | Payroll module developer |

#### Context
If we simply store `employeeId` and reference `Employee.hourlyRate` when displaying historical payroll, changing an employee's rate would retroactively change all past payslips.

#### Decision
When a payroll entry is calculated, the employee's current `hourlyRate`, `name`, and `role` must be copied into the `PayrollEntry` record as snapshot fields (`snapshotHourlyRate`, `snapshotEmployeeName`, `snapshotRole`).

#### Reason
Historical payroll must remain historically accurate. A payslip from 6 months ago must always show the rate that was in effect 6 months ago, regardless of what the employee's current rate is.

#### Consequences
- Slight data redundancy (rate stored in two places).
- Historical data is immutable and accurate.
- Reporting on "average rate over time" requires using snapshot fields.

---

### ADR-003: Approved payroll cannot be automatically changed by attendance edits

| Field | Value |
|---|---|
| **Date** | 2026-10-06 |
| **Status** | ACCEPTED |
| **Deciders** | Payroll module developer |

#### Context
If an admin corrects an attendance record after payroll has been approved, should the payroll entry automatically update?

#### Decision
No. Once a payroll entry reaches `APPROVED` status or later, attendance changes do not automatically propagate to the entry. Admin must explicitly reopen the payroll period, which is a controlled, logged workflow.

#### Reason
Automatic recalculation of approved payroll is dangerous. It would mean an approved financial record changes without explicit authorization. This breaks audit trail integrity and creates legal/financial risks.

#### Consequences
- Corrections after approval require more manual steps.
- All changes to approved payroll are explicitly tracked and logged.
- Historical payroll values are trustworthy.

---

### ADR-004: Payroll periods and payroll entries are separate entities (PROPOSED)

| Field | Value |
|---|---|
| **Date** | 2026-10-06 |
| **Status** | PROPOSED |
| **Deciders** | Payroll module developer |

#### Context
The original `payrollModel.js` merged the concept of a "pay period" and a single employee's "payroll entry" into one record. This doesn't support multi-employee payroll or period-level status management.

#### Decision
Separate `PayrollPeriods` (one record per pay run) from `PayrollEntries` (one record per employee per pay run). The period has a status, and individual entries also have an entry-level status.

#### Reason
A payroll period applies to many employees. The period's lifecycle (DRAFT → APPROVED → PAID) is independent of any single employee's entry. Separating them allows proper status management and multi-employee operations.

#### Consequences
- Need to replace/extend the current `Payrolls` Sequelize model.
- Requires a DB migration before implementation.
- Documented in `TECH_DEBT.md` as TD-02.

---

### ADR-005: Vitest chosen as the test framework (PROPOSED)

| Field | Value |
|---|---|
| **Date** | 2026-10-06 |
| **Status** | PROPOSED |
| **Deciders** | Payroll module developer |

#### Context
The project has no test framework. A test framework must be chosen before `PayrollCalculator` can be validated.

#### Decision
Use Vitest for both unit and integration testing in `japz-backend`.

#### Reason
Vitest supports ES Modules natively (the project uses `"type": "module"`). Jest requires additional configuration for ES Module support. Vitest is fast, has a Jest-compatible API, and requires near-zero configuration.

#### Consequences
- A `vitest` dev dependency must be added to `japz-backend/package.json`.
- A `"test": "vitest"` script must be added.
- Tests live in a `__tests__/` directory or alongside source files as `*.test.js`.


## 2026-11-16 ? Branch integration

The dedicated payroll branch remains authoritative; formulas and issued financial amounts are unchanged. Table-based reservations are retained. The user approved the schema and legacy-table preservation policy in docs/integration/approved-schema.md. Migrations preserve legacy online payroll tables and refuse unknown layouts. Employee roles retain admin, cashier, kitchen, rider and inventory; customers are excluded from employee synchronization. Default payroll configuration initializes only after successful database setup.

Vitest is pinned to published 4.0.18 for Node 22 compatibility: the branch version 5.0.3 requests es-module-lexer ^2.3.2, for which the registry returned ETARGET. The published V4 release and its dependency requirements were verified against registry.npmjs.org. This changes test tooling only.

The backend test runner also pins Vite 7.3.1, matching the already validated frontend toolchain. Vitest 5.0.3 has an unresolvable lexer dependency, while 4.1.12 pulls an optional Vite 8 devtool peer chain that crashes npm 10 Arborist. Version 4.0.18 constrains its Vite support to 6/7 and avoids that chain; Vite is also pinned explicitly for reproducibility.
