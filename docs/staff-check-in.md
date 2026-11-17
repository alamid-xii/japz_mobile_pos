# Employee check-in and navigation

Cashiers, kitchen staff, inventory staff, and riders sign in, then use **Clock in & open station**. An existing open shift can be resumed without another clock-in. The attendance screen shows the employee, current time, recorded clock-in, elapsed time, and completed shift summary.

Station pages and authenticated station APIs require a saved open attendance record. Refresh waits for the server check. Failed checks offer a retry and do not open the station. Attendance refreshes on window focus, every 30 seconds while visible, and after a clock-in/out in another tab. Server enforcement applies immediately to station requests.

Use the single **Clock in / out** control in the top bar to return to attendance. It shows duty status on desktop; the sidebar and profile pages have no duplicate clock controls. Clock-out requires confirmation and closes station access. The existing one-record-per-day policy remains; completed attendance requires manager review if it needs correction. An overnight open shift remains accessible. Riders must finish assigned deliveries and set their delivery status to Offline before clocking out.

Admin and customer access retain their separate workflows. Attendance uses the explicit employee/account link or a matching legacy email, never an unrelated employee with the same numeric ID. First clock-in creates a missing employee profile using the existing account details without overwriting configured pay rates. Simultaneous clock-ins are serialized.

The shared sidebar groups station tasks, records, and personal work. It includes a remembered desktop collapse setting, active page indication, and a clearly labeled sign-out button with a pending state. Attendance stays in the top bar; the sidebar has no page-search field. On mobile it opens as a drawer with keyboard focus containment and Escape dismissal. Admin navigation groups restaurant tools and people/payroll tools; inventory keeps its stock refresh control and admin return link.

No schema change or new migration is required. Database verification uses disposable test databases; it does not clock in real employees.

Verification commands:

```powershell
cd japz-backend
npm.cmd test
npm.cmd run test:db
cd ../japz-web
npm.cmd run build
npm.cmd run test:ui
```

The browser tests expect the frontend dev server to be running. Set `JAPZ_UI_BASE_URL` when using a port other than 5173.
