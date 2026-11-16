# Docker setup for the integrated POS

Docker Desktop must be running with Linux containers.

1. Run `npm run docker:setup` from this integration worktree. It generates an ignored root `.env` with random database, JWT and administrator credentials; an existing `.env` is retained.
2. Run `npm run docker:up` to build and start MySQL, the full POS backend, the Nginx frontend, and phpMyAdmin under the separate `japz-pos-integration` Compose project.
3. Open `http://localhost:8080/japz` for customer ordering and table reservation requests, or `http://localhost:8080/login` for staff. Use the private administrator credentials in `.env` for first-time administration.
4. Configure actual physical tables, inventory and payroll through the application. No restaurant tables, stock balances or financial history are invented by integration.
5. Run `npm run docker:verify` for container health and integrated endpoint checks. Use `npm run docker:logs` / `npm run docker:status` for diagnostics, and `npm run docker:down` to stop this integration project.

Default local ports are frontend 8080, backend 5000, MySQL 3307 and phpMyAdmin 8081. They bind to loopback and can be changed in `.env`. Named volumes belong to this integration project. Do not point it at an existing database without reviewing the approved migration and taking a backup.

Nginx forwards `/api/` and `/uploads/` to the backend. Production frontend builds intentionally use an empty `VITE_API_URL` for the same origin. The backend requires a strong private JWT secret and uses `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD` populated from Compose's administrator settings.

Optional Mailjet credentials enable password recovery. Optional payment gateway configuration belongs in private backend environment variables; no live payment request is made during integration verification.
