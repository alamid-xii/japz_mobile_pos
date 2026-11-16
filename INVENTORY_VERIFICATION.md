# Inventory verification — 7 October 2026

Changes were verified locally on Windows with Node.js 22, MySQL 8.4 and Chrome. The working database is `japz_pos`; test data is isolated in disposable databases.

| Check | Result | Evidence |
| --- | --- | --- |
| Backend inventory suite | PASS: 22 tests | `japz-backend/tests/inventory.test.js` — permissions, concurrent requests, quantities, atomic rollback, shared recipes, packaging, expiry, order lifecycle, counts, corrections, settings and previous-schema upgrade |
| Browser suite | PASS: 6 tests | `japz-web/tests/inventory.spec.ts` — 13 Inventory routes at six widths, phone dialogs, receipt/count approval, supplier editing, recipes, pagination, dashboard stripes, cross-role stock consumption and saved settings/conflicts |
| Scoped ESLint | PASS | Inventory feature, request-ID helper and updated Admin layout |
| Production frontend build | PASS with bundle warning | TypeScript and Vite complete; shared JavaScript remains about 873 kB minified and 223 kB gzip |
| Real local Inventory login | PASS | Newly created approved account logs in through `/login` and reaches `/inventory/overview` |
| Real inventory endpoints | PASS | items, suppliers, menu, counts, waste-reports, summary and settings return 200 with the Inventory account |
| Role boundary | PASS | Sales summary returns 403 for Inventory; test suite covers protected staff, promotions, feedback and business-hour administration |
| Real settings screens | PASS | 375px and 1440px; defaults load, Admin policies are disabled for Inventory, navigation and My account work; no browser page errors |
| Working database preservation | PASS | Original 50 menu items, eight categories, three accounts and prepared quantities match the pre-upgrade snapshot |

The working database still has zero prepared stock and no entered ingredient/packaging supplies, recipes or movements. Its new approved Inventory account is separate from the original three accounts. No browser fixture stock or orders were copied into it.

Viewport checks cover 320, 375, 390, 768, 1024 and 1440 pixels. Dialogs fit the viewport, action buttons have at least 44px height, and tested pages have no horizontal overflow. Small-screen navigation closes with Escape and hidden navigation is not keyboard-accessible. The original JAPZ logo, typography and yellow action/selection colors are retained; dashboard card accent stripes are removed.

Screenshots of the real local workspace are preserved outside the repository in `%LOCALAPPDATA%\JAPZ\<workspace-key>\screenshots\`: `local-inventory-desktop.png`, `local-settings-desktop.png` and `local-settings-mobile.png`. The startup script prints the exact workspace directory. Files prefixed `inventory-` and `admin-dashboard-` were produced by disposable browser fixtures and can contain QA sample stock.

Physical phone interaction, Safari/Firefox, staging, production and external email integrations were not tested. Real recipes, conversions, suppliers and quantities must be entered before operational stock use. The build's shared bundle warning remains a separate performance limitation.
