# Japz reservations in Docker Desktop

This adapts the supplied React/Express Docker activity to the actual `japz-web` and `japz-backend` folders. Docker runs its own MySQL database; Laragon and local development servers are independent.

## Verified startup — October 26, 2026

The stack was built and started in Docker Desktop. All four containers passed their health checks, all four runtime images were present, and both named volumes were attached correctly. The UI, direct and proxied API routes, available times, and phpMyAdmin responded successfully. A temporary reservation also passed manager login, booking, storage in Docker MySQL, confirmation, guest lookup, and cancellation checks; the test record was removed afterward.

## Start the whole system

1. Open **Docker Desktop** and wait for the **Linux engine** to be running.
2. Open a terminal in this project folder and run:

```powershell
npm run docker:up
```

This command creates the root `.env` if missing, validates Compose, builds the two application images, pulls MySQL and phpMyAdmin, creates the containers/network/volumes, waits for all health checks, and verifies the application and database-backed API. Existing credentials are preserved on subsequent runs. You do not need Node or MySQL installed inside Windows for the containers themselves; the npm helper uses your already installed Node runtime.

| Service      | Docker image                       | Open on this computer                  |
| ------------ | ---------------------------------- | -------------------------------------- |
| `frontend`   | `japz-reservations-frontend:local` | <http://localhost:8080>                |
| `backend`    | `japz-reservations-backend:local`  | <http://localhost:5000/api/health>     |
| `db`         | `mysql:8.4`                        | `127.0.0.1:3307` for a database client |
| `phpmyadmin` | `phpmyadmin:5.2-apache`            | <http://localhost:8081>                |

The ports differ from the guide's examples so the Docker stack can run alongside the local app on ports 3000/5173 and Laragon MySQL on 3306. Change the host ports in the root `.env` if needed. All published ports are bound to this computer's loopback interface.

In Docker Desktop **Containers**, look for the **japz-reservations** Compose project and its four services. The **Images** view shows the four runtime images above. The Node and Nginx base layers may also appear in build cache; intermediate build stages are not extra application services.

## Windows troubleshooting

The initial setup was blocked by a pending Windows restart. On October 26, 2026, the Windows hypervisor and Docker Linux engine were confirmed running and the image downloads started. No Windows setup change is needed while Docker Desktop's engine is running.

If a future startup reports virtualization unavailable, save your work and restart Windows first. If the problem persists, open **PowerShell as Administrator**, change to this project folder, and run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\enable-docker-windows.ps1
```

That script enables the required Windows features and sets `hypervisorlaunchtype` to `auto`. It does not restart Windows, reset WSL, delete data, or reinstall Docker. Restart Windows afterward, open Docker Desktop, and run `npm run docker:up` again.

If Docker requests a WSL update, follow Docker Desktop's prompt or run `wsl --update` from Administrator PowerShell. Keep Docker Desktop set to Linux containers and its WSL 2 backend.

References: [Docker Desktop Windows requirements](https://docs.docker.com/desktop/setup/install/windows-install/), [Microsoft WSL troubleshooting](https://learn.microsoft.com/en-us/windows/wsl/troubleshooting).

## Credentials and existing data

The root **`.env`** is Docker Compose configuration. `npm run docker:setup` generates it with separate random database/root passwords, a JWT secret, and a manager password. It is ignored by Git and excluded from the application build contexts.

- Japz manager: open <http://localhost:8080/login> and use `ADMIN_EMAIL` / `ADMIN_PASSWORD` from the root `.env`.
- phpMyAdmin: use username **`japz`** and the root `.env` value **`MYSQL_PASSWORD`**. The server is already configured as `db`.
- MySQL root credentials: `MYSQL_ROOT_PASSWORD`; the backend uses the separate `japz` database user.

The first manager account is created only if the Docker database has no existing administrator. Changing `ADMIN_PASSWORD` later does not reset an existing account. MySQL initialization passwords are also applied only to a fresh data volume. Keep your `.env` when stopping or restarting this stack.

The Docker database starts separately from Laragon. Existing local bookings, staff accounts, and other records are not automatically copied into Docker. This setup does not change the local database. Set the real restaurant hours and capacity in the Docker manager's **Booking settings** before taking reservations.

## Persistent volumes

| Volume in Docker Desktop                | Container destination  | Contents                                                            |
| --------------------------------------- | ---------------------- | ------------------------------------------------------------------- |
| `japz_reservations_mysql_data`          | MySQL `/var/lib/mysql` | Reservation records, settings, manager accounts, and database files |
| `japz_reservations_phpmyadmin_sessions` | phpMyAdmin `/sessions` | phpMyAdmin sessions                                                 |

`npm run docker:down` stops/removes this project's containers and network while retaining these named volumes and the images. Running `npm run docker:up` recreates the containers and reuses the data. Avoid `docker compose down --volumes` unless you intentionally want to delete the database.

## Verify containers, images, volumes, and the app

```powershell
npm run docker:status
npm run docker:verify
```

The verification command checks all four containers are running and healthy, all four images are installed, both named volumes exist and are mounted in the right containers, Nginx's configuration is valid, and the UI, SPA routes, direct/proxied health routes, reservation settings, and available times respond successfully.

These equivalent Docker commands are useful for activity screenshots:

```powershell
docker compose ps
docker compose images
docker volume ls --filter label=com.docker.compose.project=japz-reservations
docker compose exec frontend nginx -t
docker compose logs --tail=50 backend frontend db phpmyadmin
```

For persistence evidence, create a test reservation through the Docker UI and save its reference and email. Run `npm run docker:down`, then `npm run docker:up`. Look up the same reservation at <http://localhost:8080/manage>. This demonstrates that its data survived container recreation. No persistence claim has been made before the engine can run this check.

## Other commands

```powershell
npm run docker:setup     # Generate credentials and validate YAML; engine not required
npm run docker:up        # Build/start all services and verify them
npm run docker:logs      # Show recent logs
npm run docker:down      # Remove containers/network; preserve database volumes/images
```

To perform the activity without npm helpers, run `npm run docker:setup` once and then use:

```powershell
docker compose config --quiet
docker compose up --build --detach --wait --wait-timeout 180
```

Backend rule tests can also run inside the backend container:

```powershell
docker compose exec backend npm test
```

The integration test that creates its own temporary database remains opt-in. The normal `japz` application database account does not have global create/drop database privileges.

The Docker build installs and checks bcrypt's Linux binary, builds the React production bundle, and runs the API as the unprivileged `node` user. Nginx serves the React bundle and forwards `/api/` internally to `backend:5000`, so the browser never needs to resolve Compose service names. MySQL must pass a real SQL readiness check before the API starts; the API must be healthy before Nginx starts. This follows [Compose startup-order guidance](https://docs.docker.com/compose/how-tos/startup-order/).
