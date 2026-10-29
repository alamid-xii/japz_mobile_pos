# Japz Grill online reservations

A reservation-only web app for **Japz Grill — Burger & Bistro**. Guests can check available times, request a table without registering, and retrieve, reschedule, or cancel their booking using a private reference plus their booking email. Japz managers confirm requests, manage arrival statuses, export the guest list, and configure booking rules.

The former POS, cashier, kitchen, inventory, sales, employee registration, promotions, and feedback screens and API endpoints have been removed. Existing POS database tables and accounts are retained; the reservation server does not modify or load their data.

## Run locally

For Docker Desktop, see [the Docker setup guide](DOCKER_SETUP.md). It includes the React/Nginx, Express, MySQL, and phpMyAdmin containers, persistent volumes, and verification commands. Start the complete Docker stack with `npm run docker:up` after Docker's Linux engine is running.

Requires Node.js 20.19+ (or 22.12+) and a running MySQL server.

1. Install dependencies with `npm --prefix japz-backend install` and `npm --prefix japz-web install`.
2. Create a MySQL database and configure `japz-backend/.env` using the variables below. The existing `npm --prefix japz-backend run db:create` helper is also retained.
3. Run `npm run dev` from this directory. The frontend opens at the Vite URL printed in the terminal, normally `http://localhost:5173`; the API listens on port 3000.
4. Visit `/login` with an existing approved admin account. On a fresh installation, configure `ADMIN_EMAIL` and `ADMIN_PASSWORD` before starting to create the first manager.
5. In **Booking settings**, enter Japz’s actual seating capacity, hours, maximum party size, visit length, and booking/change notice before accepting reservations.

Backend `.env` example (use your own credentials):

```dotenv
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=japz_pos
DB_USER=root
DB_PASSWORD=
JWT_SECRET=replace-with-a-long-random-secret
PORT=3000
# Only needed to provision the first administrator:
ADMIN_EMAIL=manager@example.com
ADMIN_PASSWORD=replace-with-a-strong-password
```

The backend also supports the existing `DATABASE_URL`, `MYSQL_URL`, `MYSQL_PUBLIC_URL`, and Railway MySQL variables. It creates `reservations` and `reservation_settings` automatically without dropping legacy tables. Existing business hours are copied into initial reservation settings where available. Default settings are **24 seats, 12 guests per booking, 90-minute visits, 30-minute slots, 60 minutes’ notice, and a 60-day booking window**. These defaults must be adjusted to the restaurant’s real operation.

## Reservation behavior

- Requests begin as **awaiting confirmation**. Pending, confirmed, and seated visits reserve capacity; cancelled, completed, and no-show visits release it.
- Capacity is checked across overlapping visits inside a MySQL transaction. A shared row lock prevents concurrent requests from overbooking. Request keys prevent duplicates when a guest retries after a network failure.
- All dates and times use **Asia/Manila (UTC+8)**. Reservations must finish before closing. Overnight opening hours are not supported.
- Guests need both their randomly generated reference and booking email to retrieve or change a reservation. Rescheduling resets the status to awaiting confirmation. Changes and cancellations close at the configured notice period before the original visit.
- Manager actions follow valid status transitions. No-shows can only be marked after the arrival time. Existing bookings retain their original duration when settings change, and capacity cannot be reduced below existing commitments.
- Reference codes are shown on screen. Guests should save or print them; reservation email notifications are not configured. Calendar downloads represent a tentative booking, so guests should check the current status before visiting.
- The booking model manages total seating capacity. Individual table assignments, closed-date exceptions, and automated reminders are not included.

## Checks

```powershell
npm run build
npm test
# Additional API checks in a temporary MySQL database:
$env:RUN_DB_TESTS = '1'
npm test
```

The integration suite creates a uniquely named `japz_reservation_test_*` database on the configured MySQL server, runs against that database, and removes it afterward. The test database account needs create/drop database permission. Existing application records are never used by the tests.

Optional browser checks use an external Playwright installation and an installed Chromium browser. Start the web app, set `RUN_DB_TESTS=1`, `RUN_BROWSER_TESTS=1`, and `JAPZ_QA_PATH` to a temporary directory containing `node_modules/playwright`, then run `npm test`. `JAPZ_WEB_URL` and `JAPZ_BROWSER_PATH` can override the preview URL and browser executable. Browser API calls are routed to the isolated integration database.

## Hosting

Build the frontend with `npm run build` and host `japz-web/dist` with SPA route fallback. Set `VITE_API_URL` at build time to the public **HTTPS** backend origin when the API is hosted separately; otherwise proxy `/api` to the backend on the same origin. The local frontend defaults to `http://<current-host>:3000` for the API.

Run `npm start` inside `japz-backend` with MySQL configured. Production requires `JWT_SECRET`. Set `FRONTEND_URL` to the frontend origin (comma separated for several origins). Configure `TRUST_PROXY` only to match the hosting platform’s trusted proxy hop count so IP-based rate limits work correctly. Guest/authentication rate limits are held per server process.

Manager password recovery uses the existing Mailjet integration and requires `MAILJET_API_KEY`, `MAILJET_SECRET_KEY`, and `MAILJET_FROM_EMAIL`. This is separate from reservation notifications.

This change prepares the local application; it does not deploy to Render, Railway, or Vercel.
