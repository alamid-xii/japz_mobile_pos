# JAPZ local setup

This checkout is configured for local development on Windows with Node.js 22 and Laragon MySQL 8.4.

- Frontend: http://localhost:5173/login
- Backend API: http://localhost:3000
- MySQL: `127.0.0.1:3306`, database `japz_pos`
- Local configuration: `japz-backend/.env` and `japz-web/.env.local`

Dependencies are installed from both package lockfiles. The local database retains the original approved Admin, Cashier and Kitchen accounts, eight menu categories, and 50 menu items. A dedicated Inventory account is created separately; passwords are not recorded in this document.

## Set up a new checkout

Run `npm.cmd ci` in both `japz-backend` and `japz-web`. Copy `japz-backend/.env.example` to `japz-backend/.env`, and copy `japz-web/.env.example` to `japz-web/.env.local`. These private configuration files are ignored by Git.

Set the backend database connection for your local MySQL instance. Set `JWT_SECRET` to a unique random value of at least 32 bytes; the server rejects missing, short and placeholder signing keys. Generate a value locally with `node -e "process.stdout.write(require('node:crypto').randomBytes(48).toString('base64url'))"`, then save it only in the private backend environment. Never post it in chat, screenshots, logs or commits.

For an empty database, configure `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` privately before the first start. The password must contain 12 to 72 UTF-8 bytes. Startup creates an Admin only when these explicit settings are present. Existing accounts and passwords are preserved. To seed additional Cashier and Kitchen accounts, configure each role's `BOOTSTRAP_CASHIER_*` or `BOOTSTRAP_KITCHEN_*` pair and run `npm.cmd run seed` after initial startup creates the tables. Account setup does not print passwords. Remove the bootstrap password settings after the accounts are created.

Git transfers the application, documentation and tests. It does not transfer environment files, database contents, account credentials, local logs, backups or generated verification files.

## Start the application

Start MySQL in Laragon, then run this from the repository root:

```powershell
.\start-local.ps1
```

This starts the backend and Vite in the background. Logs and process IDs are stored outside the repository in `%LOCALAPPDATA%\JAPZ\<workspace-key>\`; the script prints the exact path. The key is derived from the checkout path so separate checkouts keep separate files. Running the script again reuses the processes it started. It does not stop other applications occupying these ports.

Keep the application open at http://localhost:5173/login while editing. Saved frontend changes update through Vite, and saved backend entry-point or imported-module changes restart the backend automatically. New backend data appears when the screen fetches it again; refresh the page if needed. These updates do not depend on a `.local` folder.

After changing environment settings or installing dependencies, restart the managed servers:

```powershell
.\start-local.ps1 -Restart
```

To use terminals instead, run each command in a separate terminal:

```powershell
cd C:\Users\ASUS\Desktop\Japz\japz-backend
node --watch --watch-preserve-output index.js
```

```powershell
cd C:\Users\ASUS\Desktop\Japz\japz-web
npm.cmd run dev -- --port 5173 --strictPort
```

## Inventory access and accounts

The application supports `admin`, `inventory`, `cashier`, and `kitchen` roles:

- Inventory workspace: http://localhost:5173/inventory/overview
- Inventory settings: http://localhost:5173/inventory/settings
- Admin inventory: http://localhost:5173/admin/inventory/overview
- Admin menu names, prices and categories: http://localhost:5173/admin/menu

The local Inventory login is `inventory@japz.test`. Its generated password was provided separately. Use My account to change it. The seeded Admin login remains `admin@gmail.com`. Admin can assign the Inventory role through Users and can open the Inventory workspace with approval and reversal controls.

Initial prepared stock quantities remain zero. Receive or count the actual prepared quantities before taking orders. Add real ingredients and packaging, receive their batches, then enter recipes before selecting Recipe stock for a menu item. Nothing resets at midnight or on a server restart. Cashier and Kitchen access still follows the configured business hours.

Startup adds the Inventory role and required columns to the previous schema, then creates the new inventory tables with non-destructive synchronization. It does not reseed menu data or replace existing balances. The existing pre-change local database backup is preserved outside the repository in `%LOCALAPPDATA%\JAPZ\<workspace-key>\backups\`. Existing screenshots and local verification files were also moved to that workspace directory. The working database remains in Laragon MySQL.

To create an additional approved Inventory account in the configured database:

```powershell
cd C:\Users\ASUS\Desktop\Japz\japz-backend
npm.cmd run create:inventory-user -- --email another-inventory@example.test --name "Inventory staff"
```

The command prints a generated password once. It refuses an existing email and does not reset an existing account.

## Verification and optional integrations

Build the frontend with:

```powershell
cd C:\Users\ASUS\Desktop\Japz\japz-web
npm.cmd run build
```

Run backend inventory tests from `japz-backend` with `npm.cmd run test:inventory`. Run browser tests from `japz-web` with `npm.cmd run test:ui` while Vite is running at `http://127.0.0.1:5173`. Browser tests use installed Chrome and a disposable backend database. Both suites use uniquely named test databases; they do not place sample orders or ingredients in `japz_pos`.

See [INVENTORY_GUIDE.md](INVENTORY_GUIDE.md) for workflows, settings, role permissions and verification details.

The existing seeded accounts can log in without email configuration. Email verification, password reset emails, and approval emails require `MAILJET_API_KEY`, `MAILJET_SECRET_KEY`, and a verified `MAILJET_FROM_EMAIL` in the backend environment. Google Sheets feedback import requires `GOOGLE_SHEETS_API_KEY` and `GOOGLE_SPREADSHEET_ID`. AI feedback analysis uses the built-in keyword analyzer unless Gemma is configured.

The supplied `npm.cmd run migrate` drops and recreates tables, and the menu seed replaces existing menu data. The completed local setup used ordinary model synchronization and seeded only the verified empty database. Do not rerun those reset operations on data you need to preserve.
