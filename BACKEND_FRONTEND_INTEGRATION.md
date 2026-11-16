# JAPZ backend and web integration

This checkout has an Express/Sequelize/MySQL backend in `japz-backend` and a React/Vite/TypeScript web application in `japz-web`. The web application serves the Admin, Inventory, Cashier and Kitchen workspaces. Local setup instructions are in [LOCAL_SETUP.md](LOCAL_SETUP.md); stock workflows are in [INVENTORY_GUIDE.md](INVENTORY_GUIDE.md).

## Configuration and startup

The backend reads its ignored `.env`. Local MySQL configuration uses DB_HOST, DB_PORT, DB_DATABASE, DB_USER and DB_PASSWORD; JWT_SECRET signs authenticated API sessions. The existing Railway URL and MYSQL_* configuration paths remain supported.

The web application reads VITE_API_URL from its ignored `.env.local`; this checkout uses `http://localhost:3000`. API calls are defined in `japz-web/src/services/api.ts`. When the web application is opened through a LAN address and the configured API uses localhost, the client uses that LAN hostname with the configured API port.

Start MySQL in Laragon, then run `.\start-local.ps1` from the repository root. Backend and Vite run at ports 3000 and 5173. The backend watches its entry point and imported modules for changes; Vite updates the frontend during development. The script records its own process IDs and logs outside the repository in `%LOCALAPPDATA%\JAPZ\<workspace-key>\` and prints the exact path. Use `.\start-local.ps1 -Restart` after environment or dependency changes. To open the web application on a phone, use the computer's LAN address on port 5173 and allow the configured ports through the existing network firewall. A physical-phone check has not been performed.

Backend startup applies the repeatable Inventory schema upgrade before ordinary model synchronization. It adds columns and tables without replacing stock balances, orders, accounts or menu data. Stock no longer resets at startup or midnight. The repository's existing migrate and menu-seed commands replace data; they are not part of the regular startup or Inventory upgrade.

## Authentication and roles

Sign in with POST `/api/auth/login`; send the returned token as `Authorization: Bearer <token>`. GET `/api/auth/user` restores the current account. Authenticated access reads the current approved account and role from MySQL instead of trusting a stale role in a token.

| Role | Web entry point |
| --- | --- |
| Admin | `/admin/dashboard`, with Inventory at `/admin/inventory/overview` |
| Inventory | `/inventory/overview` |
| Cashier | `/cashier/pos` |
| Kitchen | `/kitchen/incoming` |

Admin approves accounts and assigns roles through Users. Inventory controls stock operations but cannot manage staff, menu prices, promotions, feedback administration or business hours. My account uses PUT `/api/auth/profile` for the current account only.

## Inventory API

Inventory routes are registered under `/api/inventory`. See `japz-backend/routes/inventory.js` for the payload validation and exact permission checks.

| Resource | Operations |
| --- | --- |
| items | List/create/update ingredients and packaging, units, conversions, reorder levels, supplier and archive state |
| suppliers | List/create/update suppliers |
| receive, receipts | Record transactional deliveries and read batch/receipt history |
| prepared | Receive, count or record waste for prepared menu quantities |
| menu, menu/:id/recipes | Read derived availability, update stock source/status/reorder level, read and save recipe versions |
| cart-check | Check the whole cart and order-type packaging against current stock without reserving |
| counts, counts/:id/review | Record supply counts; Admin reviews pending differences |
| waste, returns | Record quantity losses with reasons while protecting reservations |
| waste-reports, waste-reports/:id/review | Kitchen reports losses; Inventory accepts or rejects |
| batches/:id/hold | Hold/release a batch with a reason |
| movements, movements/:id/reverse | Read stock history; Admin records eligible reversals |
| summary, settings | Read actual stock alerts and preferences; update operational settings or Admin policies |

Quantity-changing POST requests include a unique requestId. Retrying the same request and payload returns the original result; using its ID for a different change returns 409. Counts and settings carry their displayed expectedVersion to reject stale writes.

Receipt, count and waste-report APIs accept integer limit (1–200) and offset and return arrays. Movement history returns rows, total, limit and offset. The interface follows additional history pages; CSV movement exports follow all pages. Report dates use Asia/Manila business days.

## Orders, Cashier and Kitchen

POST `/api/orders` requires an Admin or Cashier account, a clientRequestId, complete cart quantities/modifiers and valid payment totals. Order, items, payment and prepared/supply reservations commit together. Overselling, negative quantities, fractional pieces, disabled menu items, invalid modifiers and stale prices are rejected.

Kitchen changes status through PUT `/api/orders/:id/status`. Starting preparation consumes the recorded allocation once. Pending cancellation releases reserved quantities; cancellation after preparation records waste and leaves those quantities consumed. Open orders retain their recipe versions and batch quantities.

Public menu endpoints return computed serving availability and variant limits. They omit recipe component records. Cashier refreshes menu availability and checks the selected order type before payment; the server repeats the whole-cart validation when the order is created. Admin menu detail edits cannot overwrite quantity balances. The retired direct-stock/reset APIs return 410.

## Local verification

From `japz-backend`, run `npm.cmd run test:inventory`. From `japz-web`, run `npm.cmd run build` and, with Vite on 127.0.0.1:5173, `npm.cmd run test:ui`. Tests create uniquely named disposable databases and do not add sample ingredients or orders to the working database.

The browser suite uses installed Chrome and actual backend responses. It covers Inventory routes and forms at six viewport widths, persisted settings and stale-edit recovery, receipt/count approval workflows, Admin dashboard card stripes and stock consumption across Cashier and Kitchen. Physical phones, other browsers, staging, production and external mail services require separate environment verification.
