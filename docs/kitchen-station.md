# Kitchen touchscreen workflow

1. In **Incoming orders**, tap **Start Preparing** on a ticket. The server saves its preparing status, then Prep Board opens automatically with that ticket first and marked **Current order**.
2. Prepare the order. Start/Ready item controls are available for tracking individual items; their two positions remain separate.
3. Tap **Done · send to cashier** when the whole ticket is finished. The server marks it ready, and Incoming orders opens automatically with a confirmation. Marking the final individual item ready also returns automatically.

Tickets already preparing have a **Continue preparing** shortcut in Incoming orders. A failed save keeps the current screen open with an error and retry control. A selected ticket that has left the kitchen displays a clear message rather than substituting another order.

Both pages keep their status filters above a separately scrolling ticket area. Tickets have equal heights, readable quantities and notes, scrollable item details, and a fixed action/progress area at their bottom. Filter buttons are at least 60px tall; preparation actions are at least 48px tall. No hover interaction is required.

The normal queue remains oldest first. Opening a ticket from Incoming orders temporarily puts the selected ticket first; switching a Prep Board filter returns to normal queue order. Refreshes preserve the selected filter and scroll position. Incoming orders refresh every 3 seconds; Prep Board every 4 seconds while visible. Older responses cannot replace a snapshot fetched after an action. Quick repeat taps on an in-flight action are ignored.

Existing inventory transitions, assigned-category filtering, audio alerts, and microphone broadcast remain in use. Ready tickets are handed to the cashier; kitchen actions do not complete the customer transaction. No schema migration is needed.

## Spoken new-order announcements

The kitchen workspace uses the browser's built-in Web Speech API. It does not use a paid speech API or add a dependency. It prefers a local English voice when one is installed.

Example: **“New order for Maria Santos: 2 Burger, no onions, extra spicy, 1 Iced tea, less ice. Order notes: Keep the sauce separate.”** Customer names, quantities, item names, meaningful modifiers, item notes when available, and order notes are read. Price/ID metadata is excluded. A missing name is announced as **Walk-in customer**.

Existing tickets form a silent baseline when this station first opens. Newly arriving pending tickets are queued oldest first and spoken one order at a time. An order's long text is split into short phrases; those phrases finish before the next order. New arrivals and microphone broadcasts join the queue without cancelling current speech. The speaker continues working in Prep Board and the other kitchen pages.

Order IDs and pending IDs are stored locally per account and backend, without customer names or order text. Navigation, refreshes, and repeated polling do not repeat started announcements. Unsaid queued orders can resume after refresh. Browser Web Locks, where supported, serialize playback across tabs so the same account's kitchen tabs do not speak the same order twice. This is browser-local history, not a restaurant-wide announcement ledger across different computers or accounts.

**Sound off** pauses current speech and retains waiting announcements; enabling sound resumes them. If autoplay is blocked, tap **Enable speaker** once. Other playback failures show **Retry speaker**. If speech is unsupported, kitchen controls remain usable and the speaker button indicates that it is unavailable.

Verification: frontend production build and lint, `playwright test tests/kitchen-touch.spec.ts`, and the disposable-database browser test named **Cashier order reservations and Kitchen consumption update Inventory together** in `inventory.spec.ts`.

`playwright test tests/kitchen-speech.spec.ts` checks phrasing, modifiers/notes, sequential delivery, navigation and refresh deduplication, two tabs, mute/resume, autoplay recovery, long orders, and unsupported speech using deterministic native-API event mocks. These tests verify application behavior; actual voice quality and speaker output depend on the browser and device.

## Completed orders and colors

Completed Orders uses a searchable table, newest completion first, with 10, 25 or 50 rows per page. Search includes order number, customer, table, order type and item names. Changing the search or page size returns to page one; refreshes clamp the page if orders disappear. The header and pagination remain visible while the table scrolls. **View** opens the order's items, modifiers, notes and timing details.

The sidebar, clock-in controls and kitchen actions use the original JAPZ yellow (`#FFCE1B`), with darker gold borders and black text. Error messages retain their warning colors.

`playwright test tests/payments-completed.spec.ts` covers completed-order pagination, search, details, responsive controls and the original yellow styling.
