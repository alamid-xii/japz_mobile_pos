# Integration schema proposal ? approval required

Integration branch: `integration/all-branches-2026-11-16`.

This is a design document, not a migration. No database has been contacted and no migration has been written or executed during integration.

## Decisions already confirmed

- Dedicated payroll branch is authoritative for payroll.
- Reservations remain table-based, using the online-ordering model and its POS/storefront flow.
- Preserve authentication hardening and admin/cashier/kitchen staff, customer, rider, and inventory access.

## Proposed canonical tables

All three tables use an auto-increment INT primary key `id`, plus non-null DATETIME `createdAt` and `updatedAt`. SQL names are explicit; existing User/Employee table names will be resolved from their Sequelize models.

### payroll_periods

Source: payroll branch `models/payrollPeriodModel.js`.

| Column | Type | Nullable | Default / rule |
|---|---|---|---|
| id | INT | No | Primary key, auto increment |
| periodStart | DATE | No | Start date |
| periodEnd | DATE | No | End date, not before periodStart |
| payDate | DATE | Yes | Scheduled pay date |
| status | ENUM | No | DRAFT; values DRAFT, CALCULATED, UNDER_REVIEW, APPROVED, PAID, LOCKED, CANCELLED |
| description | VARCHAR(255) | Yes | Human-readable label |
| createdBy | INT | No | Existing user id |
| approvedBy | INT | Yes | Approving user id |
| approvedAt | DATETIME | Yes | Approval timestamp |
| paidAt | DATETIME | Yes | Payment timestamp |
| cancelReason | TEXT | Yes | Required by service when cancelled |
| createdAt | DATETIME | No | ORM timestamp |
| updatedAt | DATETIME | No | ORM timestamp |

Indexes: `status`, `periodStart`, `periodEnd`. `payroll_entries.payrollPeriodId` links entries to a period. Preserve paid/locked history; do not introduce a deletion cascade for financial records. Keep the dedicated branch's period lifecycle and validations.

### payslips

Source: payroll branch `models/payslipModel.js`.

| Column | Type | Nullable | Default / rule |
|---|---|---|---|
| id | INT | No | Primary key, auto increment |
| payrollEntryId | INT | No | Unique; payroll_entries.id |
| employeeId | INT | No | Existing payroll employee id |
| generatedAt | DATETIME | No | Creation time |
| generatedBy | INT | No | Existing user id |
| isSuperseded | BOOLEAN | No | false |
| createdAt | DATETIME | No | ORM timestamp |
| updatedAt | DATETIME | No | ORM timestamp |

Unique index on `payrollEntryId`; index on `employeeId`. Snapshot earnings, deductions, hours and rates remain in the dedicated branch's `payroll_entries` table, which has one entry per `(payrollPeriodId, employeeId)`. Money stays DECIMAL(10,2). Do not recalculate issued payslips during migration.

### reservations

Source: online-ordering `models/reservationModel.js`. Keep this table's existing structure rather than replace it with the capacity-based model.

| Column | Type | Nullable | Default / rule |
|---|---|---|---|
| id | INT | No | Primary key, auto increment |
| code | VARCHAR(24) | No | Unique booking code |
| customerUserId | INT | Yes | Customer account, if any |
| customerName | VARCHAR(128) | No | Guest name |
| customerPhone | VARCHAR(32) | Yes | Guest phone |
| customerEmail | VARCHAR(128) | Yes | Guest email |
| partySize | INT | No | 2; validate positive and against a physical table's capacity |
| reservationDate | DATE | No | Restaurant-local visit date |
| startTime | TIME | No | Restaurant-local start time |
| durationMinutes | INT | No | 90; validate positive |
| tableId | INT | Yes | Physical restaurant table |
| status | ENUM | No | pending; values pending, confirmed, seated, completed, cancelled, declined, no-show |
| source | ENUM('online','staff') | No | online |
| notes | VARCHAR(255) | Yes | Guest/staff notes |
| staffMessage | VARCHAR(255) | Yes | Customer-visible decision message |
| createdByUserId | INT | Yes | Staff creator, if any |
| confirmedByUserId | INT | Yes | Confirming staff, if any |
| confirmedAt | DATETIME | Yes | Confirmation time |
| seatedAt | DATETIME | Yes | Seating time |
| closedAt | DATETIME | Yes | Closure time |
| createdAt | DATETIME | No | ORM timestamp |
| updatedAt | DATETIME | No | ORM timestamp |

Indexes: unique `code`, `(reservationDate, startTime)`, `(tableId, reservationDate)`, `customerUserId`. Retain supporting `restaurant_tables` and append-only `reservation_events`. Availability remains based on physical tables and time overlap, not a global seat counter. Keep `no-show` as the canonical status spelling.

## Proposed preservation and compatibility policy

1. Inspect table structure before changing it. Never use `sync({ force: true })`, drop tables, reset data, or run seeds as part of integration.
2. If `payroll_periods` / `payslips` have the older online-ordering structure, preserve them intact as `legacy_online_payroll_periods` / `legacy_online_payslips` before creating the dedicated payroll tables. Abort if an archive name already exists. Preserve ids, dates, statuses, rates, deductions and stored amounts. Retain their relationships.
3. Keep archived payroll history out of new calculations. No automatic conversion of monthly salaries, deductions, approval states or employee identities. Any later import of archived history needs a separate reviewed mapping.
4. If canonical payroll tables already exist, verify compatibility and make only explicitly required additive changes. Fail with a diagnostic for unknown/mixed layouts instead of guessing.
5. Preserve an existing table-based `reservations` table unchanged. An empty database can receive the definition above. If a capacity-based layout is detected (`reference`, `date`, `time`, `guests`), stop for a separate conversion proposal; do not overwrite it.
6. Consolidate or retire the conflicting payroll creation portions of `migrations/add-payroll-and-reservations.js` so they cannot recreate the obsolete payroll schema. Preserve its table-based reservation creation behavior.
7. Replace the destructive default migration path with an explicit, non-destructive integration path. Verification may use an isolated disposable database; no migration will be applied to the user's existing database without separate authorization.
8. Make the approved migration repeatable: re-running it should validate the resulting layout and leave existing records unchanged.

## Approval requested

Approve the canonical schemas above and the policy of preserving legacy online payroll tables intact rather than automatically converting financial history. Approval authorizes writing the integration migration; it does not authorize running migrations on an existing/live database.
