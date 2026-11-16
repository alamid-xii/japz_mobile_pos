# Branch integration record ? 2026-11-16

Target: `integration/all-branches-2026-11-16`, created from `main` in a separate Git worktree. `rerere` is enabled in repository-local configuration, with automatic staging disabled.

The requested merge order is online ordering, payroll, inventory, reservation. Every source branch is merged with `--no-ff`; reservation is applied with `--no-commit`, its 31 deleted POS files are restored from the pre-reservation integration commit, and verification precedes its merge commit.

| Source | Audited and merged tip |
|---|---|
| `online-ordering` | `611882546862a300d55306075f4879d0cff60f00` |
| `feature/payroll-attendance-module` | `328f591bd4674a3d4644bd5f1f8f0d2408a74efb` |
| `updates/inventory-workflow-fajutagana` | `c73507b5dd9c500eca8604e99cf190014f819dbc` |
| `reservation` | `fe034cbd82bcf0882dc9625007da66aeec61baca` |

Base `main`: `a1378e579f98c044216d7e581baa4d89641a3be2`. GitHub source branch tips were rechecked and still matched the audited commits.

## Resolutions

- Online ordering merged cleanly. Removed an unused `QrCode` import that prevented the frontend build, in a separate build-fix commit.
- Payroll model/export, API client, route and navigation conflicts use the dedicated payroll implementation. Existing profile time clocks reuse that implementation. The calculator source is byte-equivalent to the payroll branch; no payroll formula was changed.
- The approved schema is recorded in [approved-schema.md](approved-schema.md). The default and legacy payroll migration entry points now use the explicit preservation path. Older online-payroll tables are archived intact; unknown layouts and archive collisions stop rather than overwrite data. No existing/live database was migrated.
- Inventory keeps strong JWT-secret requirements, current approved-account checks, endpoint role restrictions, private bootstrap credentials, dependency hardening, and historical employee records. Enum upgrades preserve Admin, Cashier, Kitchen, Customer, Rider and Inventory roles instead of narrowing existing values.
- Online and counter orders share stock allocation, preparation consumption and cancellation release. Per-item kitchen preparation and delivery handover retain their workflow. Gateway orders remain awaiting payment and outside the kitchen queue; the missing ORM state was added. Stock resets superseded by inventory remain disabled.
- Frontend routing retains storefront aliases, delivery, payroll, inventory and POS pages. Inventory's responsive layouts, accessibility changes and lazy loading are retained.
- Reservation uses the selected physical-table model and existing POS/storefront routes. All 31 files deleted by the standalone reservation branch are restored exactly from pre-reservation commit `3e359d5`. Shared validation rejects impossible calendar dates and uses restaurant-local dates. A common transaction and physical-table locks prevent simultaneous confirmations or staff bookings from overbooking a table.
- The storefront popular-items query now quotes the actual ORM table names, so the menu loads on case-sensitive MySQL hosts.
- Compatible Docker tooling is retained and adapted to the complete application: private bootstrap configuration, health endpoint, same-origin API requests, uploaded images, and table-based verification endpoints.
- Package manifests and lockfiles are reconciled. The payroll branch's Vitest 5 dependency chain requested an unavailable lexer version; test tooling is pinned to published Vitest 4.0.18 and Vite 7.3.1, and all payroll tests pass. Inventory's dependency hardening is retained. The browser harness drains in-flight requests at teardown and allows disposable schema setup sufficient time; functional assertions are unchanged.

## Verification

- Frontend builds passed after each merge stage; the final build completed successfully.
- 62 backend unit tests passed: 30 payroll calculation/report tests and 32 security, schema/model and reservation-rule tests.
- 40 MySQL integration tests passed: inventory/online allocation, authentication, table booking concurrency/lifecycle, application startup, and the approved migration.
- Migration checks cover fresh creation, repeat runs, unchanged archived financial rows/ids/relationships, incompatible reservation layouts and archive-name collisions.
- All 16 browser checks passed after targeted rechecks: the 15 existing checks passed in the final full run; the added storefront/payroll/reservation check exposed a case-sensitive MySQL table-name bug, which was fixed and passed on rerun. Startup checks for that endpoint also passed again.
- All 142 JavaScript files passed syntax checks. Package manifests/lockfiles have valid JSON without duplicate keys.
- Docker Compose configuration passed validation with disposable values. Docker images were not built or deployed as part of this task.
- All 31 restored POS files matched their pre-reservation contents. The original checkout's status and 28 modified/untracked file fingerprints matched the initial snapshot. `main` and the existing local branch pointers remain unchanged.

Verification used Node 22.14.0 and an isolated MySQL 8.4 container. No live payment, email, or production database operation was performed.

## Omitted content and preserved work

- Generated `output/` artifacts are excluded from the final tree and `/output/` is ignored. Original commits retain those artifacts in history because source history was preserved.
- The competing capacity-based reservation model/settings, standalone reservation-only screens and their incompatible client are omitted in favor of the approved table-based implementation. Their API tests were adapted to the selected model; shared validation utilities and compatible Docker support remain.
- The older online-payroll route/page is superseded by the dedicated payroll module. Archived online-payroll history is not automatically converted or recalculated.
- The original checkout's uncommitted work is deliberately outside this integration and remains untouched.
- No source branch is omitted from merge ancestry. No branch was pushed or deleted, and no pull request was created or changed.
