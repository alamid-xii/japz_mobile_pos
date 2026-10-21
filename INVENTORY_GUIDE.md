# JAPZ inventory development guide

The Inventory workspace covers ingredients, packaging, prepared menu quantities and recipe-based menu availability. It retains the JAPZ logo, Inter typography and yellow primary actions. Stock changes are recorded through inventory workflows rather than editable menu quantity fields.

## Workspaces and permissions

| Role | Inventory responsibilities |
| --- | --- |
| Inventory | Supplies, units, suppliers, deliveries, batches, prepared quantities, recipes, availability, counts, waste, returns, Kitchen waste review, stock reports, alert and refresh settings |
| Admin | All Inventory operations, supply count approval policies and limits, count review, eligible movement reversals, default prepared reorder levels; menu names, prices, categories and account roles |
| Cashier | Current menu availability, whole-cart checks and stock reservation at checkout; own pending-order cancellation and ready-order completion |
| Kitchen | Consume reserved quantities when preparation starts; follow order transitions and submit ingredient or packaging waste reports |

Inventory staff sign in at `/login` and open `/inventory/overview`. Admin opens the same tools at `/admin/inventory/overview`. The old `/admin/stocks` route redirects to Prepared stock. Account roles and status are read from the database on authenticated requests, so deactivation and role changes affect existing sessions.

## Initial stock setup

1. Add actual ingredients and packaging in Ingredients & packaging. Use `g`, `ml` or `pcs` as the base unit. Record the purchase unit and its conversion, such as 1 kg = 1,000 g or 1 box = 50 pcs. A purchase unit equal to the base unit has conversion 1.
2. Add suppliers, then receive opening stock or a delivery. Each line records a batch, base quantity, conversion and cost. Record expiry where applicable; use Hold for a batch awaiting inspection.
3. Use Prepared stock for items counted directly in pieces. Receive prepared quantities, record physical counts, or record waste with a reason.
4. Save actual recipes in Menu availability before selecting Recipe stock. Quantities are per one serving. Resolve existing prepared balances before changing an item to recipe stock.
5. Check dine-in, take-out and delivery availability. Add packaging components with the appropriate order-type condition.

The local working database keeps its 50 original menu items and eight categories. Real stock, recipes, purchase conversions and supplier records must be entered for the business. Browser test fixtures do not populate the working database.

## Recipes and menu availability

Recipes can reference supplies and other menu items for combos. Profiles can match size, flavour and temperature. A specific profile takes precedence over a default profile; equally specific conflicting matches are unavailable until corrected. Circular menu components are rejected.

Each save creates a recipe version. Existing orders retain their reserved quantities, batch allocations and recipe versions. Menu availability considers category status, selling status, archive state, prepared balances, ingredient quantities, packaging, expiry and holds. A menu item's serving limit does not guarantee that several different items fit in one cart; the cart check and order transaction combine their shared requirements.

Admin owns menu names, prices and categories. Saving those details cannot replace inventory balances. Archived menu items and categories remain available in historical records; unavailable or archived items cannot be ordered.

## Order stock lifecycle

| Event | Stock behavior |
| --- | --- |
| Cashier submits a valid paid checkout | Atomically creates order, items and payment; reserves the complete cart |
| Kitchen starts preparation | Consumes allocated prepared stock and ingredient/packaging batches once |
| Pending order is cancelled | Releases reservations |
| Order is cancelled after preparation | Records waste; consumed quantities remain consumed |
| The same order request is retried | Returns the original result; does not reserve or charge twice |

Eligible batches are allocated by earliest expiry, then receiving date. Expired and held stock do not contribute to availability. If a reservation expires before preparation, the order cannot start preparation; cancel it, replenish and place a new order. Manual losses and counts cannot remove reserved quantities.

Orders placed before this upgrade have no new allocation record. They retain the previous stock treatment and are not deducted or automatically restored again. Reconcile those orders against actual stock when adopting the new workflows.

## Counts, losses and corrections

Supply counts compare a physical batch count with the version shown when the form was opened. Subsequent stock movements make the count stale. Admin can set per-item difference limits or require review for every Inventory supply count. A pending count does not change the balance; approval verifies the version again. Prepared-item counts apply immediately and reject a changed prepared balance.

Record waste and supplier returns with quantities and reasons. Kitchen waste reports wait for Inventory review before quantities change. Accepted reports are applied once. Admin reverses eligible receiving, count, waste or return movements through a new correction entry; the original entry remains in history.

Movement history supports date, action, supply and menu filters, balances, actor, reason and CSV export. Receipt, count and waste-report histories load their additional API pages so older records stay reachable. Current stock exports keep base units separate; prepared quantities export in pieces. Recorded supply value uses on-hand batch quantities multiplied by receiving costs and includes reserved, held and expired stock until removed. Usage reports show gross recorded events; reversal entries are retained in the movement export for reconciliation.

## Inventory settings

Inventory settings are shared across Inventory workspaces:

Inventory staff use **Settings** inside their workspace at `/inventory/settings`. Admin can open the existing **Inventory** workspace and then select **Settings** at `/admin/inventory/settings`. The main Admin **Settings** page at `/admin/settings` contains the Admin profile, activity-log exports, business hours and feedback QR code.

- **Expiry warning window:** 1–90 days. Controls the overview's expiry list. Expired batches are always excluded from availability.
- **Refresh interval:** 15, 30, 60 or 120 seconds in the interface. Refresh also runs when the window regains focus.
- **Supply count approval policy:** Admin chooses per-item limits or review of every Inventory supply count. Admin counts apply immediately.
- **New prepared-item reorder level:** Admin sets the default for newly created menu items. Existing item levels stay as recorded.

The page shows unsaved changes, save progress, success and errors. Concurrent edits produce a conflict message and a Use current settings action; another person's settings are not silently replaced. My account is a separate page for name, email and password changes.

Stock never resets at midnight or on restart. Legacy defaultStock and lastStockReset fields remain for compatibility but no longer cause replenishment; legacy reset and direct-stock endpoints return HTTP 410.

## Development and verification

Backend implementation is in `japz-backend/models/inventoryModels.js`, `services/inventoryService.js`, `services/menuAvailability.js`, `services/inventoryOrders.js`, `services/inventorySettings.js`, `services/inventorySchema.js` and `routes/inventory.js`. Interface code is in `japz-web/src/features/inventory/`. The schema upgrade is additive and repeatable; ordinary synchronization uses `alter: false`.

```powershell
# From japz-backend
npm.cmd run test:inventory

# From japz-web, with Vite running at 127.0.0.1:5173
npm.cmd run test:ui
npx.cmd eslint src/features/inventory src/utils/requestId.ts src/layouts/AdminLayout.tsx
npm.cmd run build
```

The API suite uses a uniquely named disposable MySQL database. The browser suite starts its own disposable backend and forwards API requests to it; it does not mock the stock service. Browser checks cover 13 Inventory routes at 320, 375, 390, 768, 1024 and 1440 pixels, small-screen dialogs, count approval, receiving, supplier editing, recipes, settings persistence/conflicts, Admin dashboard stripes and the Cashier/Kitchen stock flow.

These checks establish local Chrome and MySQL behavior. Physical phone input, other browsers, staging, production and external email services require verification in their own environments. Vite currently reports a large shared JavaScript bundle; route splitting is a separate performance task.
