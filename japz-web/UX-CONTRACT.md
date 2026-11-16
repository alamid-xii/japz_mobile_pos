# JAPZ POS interaction contract

This refinement preserves the implemented business behavior. Audience: restaurant staff and customers leaving QR feedback. English copy, Philippine peso currency, existing backend date/time conventions. Accessibility target: WCAG 2.2 AA; browser automation does not establish physical-device or assistive-technology acceptance.

Business sources: `../INVENTORY_GUIDE.md`, `../INVENTORY_ARCHITECTURE.md`, `src/App.tsx`, `src/components/ProtectedRoute.tsx`, backend `routes/`, `services/inventoryService.js`, `services/inventoryOrders.js`, and `services/menuAvailability.js`. Backend permission, stock, payment and lifecycle rules remain authoritative. No new business policy, role access or provider contract is introduced.

Visual source: `DESIGN.md`; existing runtime CSS/Tailwind tokens remain canonical. Supported theme: existing light theme.

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Select/Listbox | Native select | Existing page controls | OS-owned popup | Keyboard and opened popup |
| Date | Native date/time inputs | Existing domain form controls | OS-owned locale and popup | Input, keyboard, narrow viewport |
| Form | src/components/Form.tsx | HTML constraints plus existing submit handlers | Auth, profile, inventory | Invalid, first focus, submit, recovery |
| Scrollbar | src/index.css | Global standard properties | High-contrast system colors | Computed style and overflow |
| Toast | src/components/FeedbackProvider.tsx | In-app notice dialogs and dismissible success status | Existing success notices retained | Live region and dismissal |
| CRUD | Existing screen handlers | Backend routes/services above | Existing destination/refresh | Disposable database integration |
| Dialog | src/components/Modal.tsx | HTML dialog modality | Inventory form dialog in shared.tsx | Escape, focus loop and restoration |
| Navigation | Existing role layouts | App.tsx and ProtectedRoute.tsx | Drawer, sidebar, bottom links | Role routing, resize, keyboard |

Native controls intentionally retain browser/OS popup geometry, locale and keyboard behavior. No authored combobox or calendar is introduced.

## Workflow rules

Preserve each existing operation's destination, data refresh, validation and permissions. Prevent duplicate submission where the existing busy/processing state applies. Cancel leaves data unchanged. Destructive confirmation remains explicit and focuses cancellation first. Errors preserve entered values and offer correction/retry. The new form wrapper preserves HTML constraints while replacing browser validation bubbles with an inline summary, invalid semantics and first-field focus.

Local filtering/pagination remains in the owning screen and is intentionally transient; this task does not change API paging or URL-state contracts. Existing bounded Inventory pagination remains. Operational live queues retain their current full-list policy. Empty checkout and receipt routes offer a visible path back to POS/history. Missing routes show an honest 404. Route titles identify the current screen.

## Responsive and keyboard behavior

Admin/Inventory mobile drawers trap focus, expose an internal close control, close on Escape/navigation, isolate content and reset on desktop resize. Cashier/Kitchen retain bottom navigation and real links. Skip links target the main scroller. Dialogs are viewport-bounded and scroll internally. Inventory mobile record labels retain table header semantics; other complex tables scroll inside their own panels. Focus indicators and reduced-motion rules are shared.

## Verification

`npm run build`, `npm run lint`, `npm run test:ui`, and backend `test:inventory`/`test:security` are the project checks. Browser tests use a disposable database and generated accounts, never production credentials. Viewports: 320/360/390/768/1024/1440px, with short-height and intermediate-width cases. Retain screenshots outside the source tree using `tests/local-paths.ts`. Provider emails, hosted TLS/headers, device keyboards, real payment hardware and screen-reader acceptance require their own evidence.
