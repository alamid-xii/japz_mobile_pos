# JAPZ integrated POS

This integration combines online ordering, delivery and PayMongo, the dedicated payroll/attendance module, the inventory workflow, and table-based reservations.

- Customer storefront: `/japz` (existing `/order` links also work).
- Staff sign-in: `/login`; Admin, Cashier, Kitchen, Rider and Inventory retain their own access.
- Reservations use physical restaurant tables. Customers request bookings; staff confirm and assign a table.
- Payroll uses the dedicated payroll module. Existing online-payroll history is preserved separately by the approved migration.

## Development

Install locked dependencies with `npm ci` inside `japz-backend` and `japz-web`. Configure `japz-backend/.env` from its example with a private, strong JWT secret and your database credentials. Do not commit environment files.

Run `npm run dev` from this directory to start both applications, or start the backend and frontend separately. `start-local.ps1` and `LOCAL_SETUP.md` retain the inventory branch's local setup workflow.

## Database migration

Read [the approved schema](docs/integration/approved-schema.md) before running a migration. Back up any existing database first. `npm run db:create` in the backend creates only the configured database if absent. `npm run migrate` uses the non-destructive integration entry point.

The migration creates missing tables, adds safe missing columns and expands enums without removing existing values. It preserves older online payroll tables as `legacy_online_payroll_periods` and `legacy_online_payslips`. It does not recalculate historical pay, reset tables, or run business-data seeds. Unknown/mixed schemas and capacity-based reservation layouts stop with a diagnostic.

Existing databases were not migrated during branch integration. Migration verification used disposable MySQL databases only.

## Verification

From `japz-backend`:

- `npm test`: payroll calculation/report tests plus security, schema/model and reservation-rule unit tests.
- `npm run test:db`: inventory/online integration, schema migration, table reservation API and application startup tests. These require an isolated MySQL server with credentials supplied through `DB_HOST`, `DB_PORT`, `DB_USER` and `DB_PASSWORD`; suites create and remove only their own test databases.

From `japz-web`, run `npm run build`. Its browser suite is `npm run test:ui`; start the frontend first, set `JAPZ_UI_BASE_URL` if using a non-default port, and supply the isolated MySQL credentials for its fixture server. Browser artifacts are stored outside the checkout.

## Docker

See [Docker setup](DOCKER_SETUP.md). `npm run docker:setup` creates random local credentials in this worktree's ignored root `.env`. `npm run docker:up` builds and starts the integration's separate Compose project. The frontend uses same-origin API and upload proxies. The configured `ADMIN_EMAIL` / `ADMIN_PASSWORD` feed the hardened bootstrap account configuration.

No Git branches are pushed or deleted by these workflows.

The [integration record](docs/integration/merge-report.md) lists source commits, conflict decisions, verification and omitted content.
