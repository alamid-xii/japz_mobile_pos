# JAPZ GRILL ordering and staff closing-time update

Changes remain local on branch `final`. No push, branch deletion or production deployment is included.

## Online Ordering route investigation

The reported URL is `http://localhost:5173/japz`. A fresh Chrome session loaded that exact URL with HTTP 200, the existing menu and no page errors before this update. The menu route itself was present. The shared page-title map was missing the `/japz` and `/order` entry routes, so it assigned the browser tab “Page not found” even when the menu was working. `RouteAnnouncement.tsx` now labels these entries Online Ordering · JAPZ GRILL and provides titles for the customer subpages. Unknown URLs retain a real not-found title.

The canonical `/japz` entry and existing `/order` QR links remain public. Their menu, cart, authentication, reservation, tracking and payment-return routes are retained. Welcome and the not-found page now include explicit Online Ordering links. Existing SPA rewrites in Nginx and Vercel remain in place, with cache headers added for worker updates and static assets. Browser tests open the route directly, refresh it and open legacy links. Unknown paths still show a real not-found page.

## Ordering, appearance and intro

- Official brand: JAPZ GRILL — Burger & Bistro. The supplied image matches the existing `public/logo.jpg`; that original artwork is used for the ordering header, intro reveal, loading/offline screens and PWA icons. JAPZ yellow `#FFCE1B`, darker gold and black text remain the interface colors.
- Mobile navigation has persistent cart access, clear categories, larger images, readable product names and touch-sized quantity controls. Checkout retains customer authentication, table QR codes, saved addresses, delivery pins, extras, stock rules, order tracking and server-computed payments.
- Menu data refreshes on entry, reconnection, returning to the tab and every minute while visible. Existing cart quantities survive; valid line prices follow fresh menu prices. A failed refresh disables ordering and shows a connection message. The server still determines the final order price.
- The padded JAPZ GRILL logo is the centered hero, followed by “Made fresh. Delivered happy.” and “Your favorites are one tap away.” Hand-drawn burger, fries and drink icon badges and a subtle brand halo surround the 3.6-second delivery scene. The rider wears a yellow helmet, bobs along the moving road and brakes at the door. The yellow box has an orange flame, follows an arc and lands with a soft bounce, followed by a delivery check badge and brief sparkles. Get Started fades in after the animation finishes naturally. The welcome screen has no Skip button. Reduced motion uses a static final frame with the food icons and delivery check visible. Store status below the action uses real configured hours, with no delivery estimate. There is no header logo, theme control or footer on the welcome screen.
- Light/dark mode applies to all customer ordering pages, including welcome, with the device setting as default and a remembered customer override. A compact 44px sun/moon button appears in the shared header on every ordering page except welcome. Desktop uses one header row for the restaurant name, hours, navigation and controls; mobile/tablet retains bottom navigation. Theme changes fade over 250ms; reduced motion suppresses the fade. ERP and staff login pages stay light. The ERP landing page no longer has an Order food online button; `/japz` remains the direct customer entry.
- See [the current welcome-screen change report](welcome-screen.md) for the changed files, focus behavior and verification scope.
## PWA behavior and deployment

`public/manifest.json` names the app **JAPZ GRILL**, starts at `/japz/`, uses standalone display and provides actual 192px, 512px and maskable PNGs. The icons are generated from the official logo, preserving its black lettering, orange flame and white background. The maskable version fits the artwork inside the safe area. A branded application-loading screen accompanies the platform splash generated from the manifest/icon.

The build generates a versioned static-file allowlist for `public/sw.js`. Only static HTML, JS, CSS, fonts, the official restaurant logo and app icons can enter its cache. API responses, menu prices, food uploads, logins, orders and payments are excluded. API responses also receive `Cache-Control: no-store, private` from the server. Existing account-token/cart storage is retained; no new authentication storage is introduced by the worker.

Opening the installed ordering app offline gives a friendly reconnect page. It never queues or replays orders or payments. If the app is already open when its connection fails, it reports the failed menu refresh and blocks ordering until fresh data is available. A worker update waits for the ordinary lifecycle; it does not force-refresh an active checkout.

Install App uses Android's available browser prompt. On iPhone it gives **Share → Add to Home Screen** instructions. The offer hides in installed mode and remembers dismissal. A prompt arriving during the intro is retained until the menu opens. Browser/platform installation eligibility still applies. This follows the [browser install-prompt API](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeinstallprompt_event) and [Apple's Home Screen web-app behavior](https://developer.apple.com/videos/play/wwdc2023/10120/).

Build and deploy the `japz-web/dist` directory, including `sw.js`, the manifest and icons, to an HTTPS host. Public production HTTP URLs redirect to HTTPS in the client; TLS must still be configured at the hosting/reverse-proxy layer. Localhost is a browser secure-context exception. Plain HTTP on a LAN does not support installation. No public hostname, certificate or hosting deployment was changed in this task.

## Attendance rules

The default opening/closing hours are **7:00 AM–8:00 PM, Asia/Manila**. Existing saved hours are preserved. Admin → System settings → Business Hours edits both times and the automatic clock-out switch. The cashier/kitchen role checkboxes control existing login-hour restrictions; automatic clock-out covers all employee attendance roles.

The server checks open shifts every minute and once on startup. It writes the applicable Philippine closing instant, not the later processing time. It uses the existing unpaid-break and work-hour calculations, serializes writes with row locks, and creates an audit entry in the same transaction. Repeated or concurrent job runs do not duplicate a punch. Normal manual clock-out uses the same row lock so the scheduled and manual punches cannot overwrite each other.

In Admin → Attendance → All Shifts, **Auto clocked out** identifies automatic punches. Correct opens an editor in Philippine time, independently of the admin device's timezone. Corrections keep the original automatic cutoff and processing time. The audit history is retained.

For an open shift, Correct also provides **Keep this shift open after closing time** and a required approval reason. Save overtime decision records the approving admin and time. Staff with that per-shift approval are skipped until they clock out manually. Revoking the exception makes the next scheduled run apply the closing rule again. The existing payroll `overtimeAllowed` setting is eligibility, not approval. Owner/manager operations use the existing `admin` account role; no role is granted new privileges.

Cashier/kitchen staff with an open, approved overtime shift can sign back in outside normal opening hours. The server verifies the approval after password authentication; a client-supplied flag cannot grant it. Without approval, the existing login-hours restriction still applies, using Philippine time.

Attendance belonging to APPROVED, PAID or LOCKED payroll is skipped by the automatic job and protected from correction until the payroll period is reopened. This prevents catch-up work from silently changing finalized payroll. No payroll calculation or payslip schema was changed.

The backend must be running for a scheduled job to run at closing. A sleeping/free hosting service cannot guarantee an 8 PM execution; startup catch-up still uses 8 PM as the punch time. Use an always-on server or an external server scheduler invoking `npm run attendance:close` every minute. That command is idempotent and uses the same rules. No hosting plan or external scheduler was provisioned.

## Additive attendance migration

The existing local database was inspected and the scoped attendance migration was then applied after a backup. Original attendance/business-hours row values and all protected financial schemas were verified unchanged. The scheduler was not invoked against the existing database during verification. The new migration only adds:

| Table | Column | Definition |
|---|---|---|
| Attendances | clockOutSource | VARCHAR(16), default `manual` |
| Attendances | autoClockedOutAt | nullable DATETIME; scheduler processing time |
| Attendances | autoClockOutOriginalTime | nullable DATETIME; original closing cutoff |
| Attendances | overtimeApprovedAt | nullable DATETIME |
| Attendances | overtimeApprovedBy | nullable integer; approving admin ID |
| Attendances | overtimeApprovalReason | nullable VARCHAR(255) |
| business_hours | autoClockOutEnabled | boolean, default true |

It preserves existing rows and is repeatable. It resolves table names without assuming database case rules. It does not alter `payroll_periods`, `payslips` or `reservations`. The existing integration migrator also recognizes model additions; use the scoped command below when the existing application schema is already installed.

For other installations, back up attendance and business-hours data, then run:

```powershell
cd japz-backend
npm.cmd run migrate:attendance
# Restart the backend, then check Admin settings and open shifts.
```

Enabling the job can close already-overdue open shifts at their applicable closing time. Approve legitimate overtime before enabling it. For rollback, disable the automatic clock-out switch and restore the previous application code; the additive columns can remain. Correct verified punch times through Admin rather than deleting audit metadata or automatically reopening every shift.

Local backup: `japz-backend/.local/backups/before-attendance-auto-1794836423614.json` (ignored by Git). Three existing open shifts were overdue at inspection. Restarting the updated backend activates the job; those shifts are subject to the normal cutoff, overtime and payroll-protection checks.

## Changed modules and files

| Module | Files |
|---|---|
| Routes/loading/entry links | `japz-web/src/App.tsx`, `main.tsx`, `pages/Welcome.tsx`, `pages/NotFound.tsx`, `components/AppLoading.tsx`, `components/RouteAnnouncement.tsx` |
| Ordering appearance and ERP light scope | `japz-web/src/theme.ts`, `components/ThemeToggle.tsx`, `components/OrderingThemeScope.tsx`, `components/WorkspaceShell.tsx`, `styles/theme.css`, `features/inventory/inventory.css` |
| After-hours overtime login | `japz-web/src/hooks/useAuth.tsx`, `japz-backend/routes/index.js`, `japz-web/tests/staff-shift.spec.ts` |
| Ordering shell and menu | `japz-web/src/pages/public/storefront/StorefrontLayout.tsx`, `StorefrontContext.tsx`, `Home.tsx`, `MenuPage.tsx`, `CartPage.tsx`, `components/ProductCard.tsx`, `components/CategoryChips.tsx`, `styles/storefront.css` |
| Shared storefront URL helper | `pages/public/storefront/storefrontRouting.ts`; imports updated in Home, MenuPage, CartPage, TrackPage, AuthPage, ProfilePage, ReservePage and PayReturnPage |
| Rider animation | `japz-web/src/assets/rider.svg`, `components/OrderingIntro.tsx`, `utils/orderingSession.ts`, `styles/ordering-intro.css` |
| PWA and hosting | `japz-web/src/pwa.ts`, `components/InstallApp.tsx`, `public/manifest.json`, `public/sw.js`, `public/offline.html`, `public/logo.jpg`, `public/icons/*.png`, `scripts/generate-pwa-icons.mjs`, `scripts/pwa-shell.ts`, `vite.config.ts`, `index.html`, `nginx.conf`, `vercel.json` |
| Server scheduling and metadata | `japz-backend/services/attendanceAutoClockOut.js`, `attendanceTime.js`, `attendancePayrollLock.js`, `attendanceService.js`, `models/attendanceModel.js`, `models/businessHoursModel.js`, `index.js` |
| Admin configuration, approval and correction | `japz-backend/routes/index.js`, `routes/payrollRoutes.js`, `controllers/payrollController.js`; `japz-web/src/pages/admin/Settings.tsx`, `AttendanceManagement.tsx`, `pages/employee/ClockInOut.tsx`, `contexts/ShiftContext.ts`, `services/api.ts` |
| Migration and CLI | `japz-backend/migrations/add-attendance-auto-clock-out.js`, `scripts/close-attendance.js`, `package.json` |
| Verification | `japz-backend/__tests__/attendanceTime.test.js`, `__tests__/attendanceScheduler.test.js`, `tests/attendanceAutoClockOut.test.js`; `japz-web/tests/ordering-experience.spec.ts`, `ordering-pwa.spec.ts`, `attendance-policy.spec.ts`, `inventory.spec.ts` |

Existing unrelated working changes and uploads are retained. No dependency package was added.

## Verification

Backend unit/security/model/rule checks and all disposable database regressions cover normal attendance, PH cutoffs, concurrent jobs, approvals and permissions, corrections, catch-up, approved payroll protection, inventory, reservations and migration preservation. Browser checks cover direct/refresh routes, session gating, natural rider animation completion, Get Started and tracking, reduced motion, theme controls across ordering pages (except welcome), one-row desktop navigation and ERP light appearance, mobile categories/cart/checkout, fresh prices, Android/iPhone/installed behavior, PWA offline/cache boundaries, Admin controls and existing staff/kitchen/payment workflows.

PWA browser test: build the frontend, run a production preview, then set `JAPZ_PWA_BASE_URL` to that preview before running `tests/ordering-pwa.spec.ts`. The normal browser tests use `JAPZ_UI_BASE_URL`. Native iPhone/Android installation and physical speaker/phone output still require device checks; desktop mocks verify the application's install-control behavior.
