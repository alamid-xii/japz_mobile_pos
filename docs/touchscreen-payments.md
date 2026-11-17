# Cashier touchscreen payment

Checkout keeps the payment method, amount due and **Proceed to Payment** action in one fixed panel. Customer details, delivery address and optional notes scroll separately. Discounts, vouchers and the full breakdown open in a separate dialog.

Cash collection keeps the amount received, change and **Complete Transaction** action visible. The screen includes a large numeric keypad, **Exact** and **Clear** controls, and a separate order summary. On narrower screens, use **Review order** to open that summary without moving the payment controls. Quick cash amounts are available on taller displays; the keypad remains available at shorter heights.

Card/GCash checkout keeps its total, close action, payment check and cancellation controls visible while the QR and longer details scroll separately. A gateway order remains unpaid until the server confirms payment.

The controls use the original JAPZ yellow (`#FFCE1B`). No database migration is needed for these layout changes.

Verification:

- Production build and lint on changed TypeScript files.
- `playwright test tests/payments-completed.spec.ts`: fixed controls at 320–1366px widths, usable keypad, discount/voucher totals, change, stock errors, free orders, repeat-tap protection and server-confirmed gateway payment.
- `playwright test tests/inventory.spec.ts --grep "mobile checkout completes a real disposable order"`: actual checkout, stock/order persistence and receipt rendering in the disposable test database.
