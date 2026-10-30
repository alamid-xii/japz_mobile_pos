# PAYROLL PLAN AUDIT REPORT
**Generated:** 2026-10-06 | **By:** Full codebase inspection vs. all docs

---

## 🟢 CORRECT — Plan Aligns With The Real System

| # | Claim in Our Docs | What We Found in Code | Verdict |
|---|---|---|---|
| 1 | Backend uses Node.js / Express / Sequelize | `routes/index.js`, `models/db.js` confirmed | ✅ Correct |
| 2 | Frontend uses React + TypeScript + Vite + Axios | `api.ts`, `Employees.tsx` confirmed | ✅ Correct |
| 3 | JWT token stored as `'authToken'` in localStorage | `api.ts` line 23 confirmed | ✅ Correct |
| 4 | `verifyToken` middleware exists in routes | `routes/index.js` lines 41-53 confirmed | ✅ Correct |
| 5 | `Employee` model has `hourlyRate` as `DECIMAL(10,2)` | `employeeModel.js` lines 47-51 confirmed | ✅ Correct |
| 6 | `Attendance` model has `clockIn`, `clockOut`, `totalHours` | `attendanceModel.js` confirmed | ✅ Correct |
| 7 | `Payroll` model has `grossPay`, `deductions`, `netPay` | `payrollModel.js` confirmed | ✅ Correct |
| 8 | `Payroll.status` is only `pending`/`paid` — insufficient | `payrollModel.js` line 38 confirmed | ✅ Correctly flagged as gap |
| 9 | `clockIn`/`clockOut` uses `DataTypes.TIME` — overnight gap | `attendanceModel.js` lines 14, 18 confirmed | ✅ Correctly flagged in TECH_DEBT |
| 10 | `createLog()` utility exists and is already imported | `routes/index.js` line 12 confirmed | ✅ Correct |
| 11 | `Log.action` is a fixed ENUM with `'OTHER'` as fallback | `logModel.js` lines 40-60 confirmed | ✅ Correct |
| 12 | No payroll or attendance routes exist in `routes/index.js` | Grepped both — zero results | ✅ Correctly identified as greenfield |
| 13 | No payroll service exists in `services/` | Services dir only has AI/email/feedback/sheets | ✅ Correctly identified |
| 14 | No payroll page exists in `pages/admin/` | Dir has 8 pages, no payroll | ✅ Correctly identified as greenfield |
| 15 | All API objects live in `services/api.ts` | Confirmed — all 10 API objects are there | ✅ Correct pattern to follow |
| 16 | Frontend uses `usersAPI`, not direct axios calls | `Employees.tsx` line 3 confirmed | ✅ Correct pattern to follow |
| 17 | `Employee` model has separate `password` field from `User` | `employeeModel.js` line 19 confirmed | ✅ Correctly identified as separate entity |
| 18 | No link between `Employee` and `User` tables | No FK in either model — confirmed | ✅ Correctly flagged as TD-03 |
| 19 | `Employee.status` is `active`/`inactive` ENUM | `employeeModel.js` lines 42-46 confirmed | ✅ Correct |

---

## 🔴 GAPS — Things Our Docs Got Wrong or Missed

### GAP-01: `createLog()` Signature is Different From What We Documented

**What our docs say to use:**
```javascript
await createLog({
  action: 'OTHER', module: 'payroll', userId: req.user.id, ...
});
```

**What the actual `routes/index.js` uses (line 2882):**
```javascript
await createLog(req.user.id, 'update', 'business_hours', businessHours.id, req);
```

**Impact:** 🔴 HIGH — Our `CODING_STANDARDS.md` and `AI_AGENT_RULES.md` show the wrong function signature. If we code payroll using the object signature and the real function uses positional params, it will crash.

**Fix Needed:** Read the actual `utils/logger.js` source and update our docs with the real signature.

---

### GAP-02: `verifyToken` Has No `requireAdmin` Equivalent Yet

**What our docs say:**
```javascript
router.use('/api/payroll', verifyToken, requireAdmin);
```

**What actually exists in `routes/index.js`:**
- `verifyToken` middleware exists (lines 41-53).
- There is **NO `requireAdmin` middleware** anywhere in the file.
- Currently, role checks are done inline in each route handler, not as a middleware.

**Impact:** 🟡 MEDIUM — We need to either create a `requireAdmin` middleware ourselves, or inline role checks just like the rest of the codebase does. Our docs reference a function that doesn't exist yet.

---

### GAP-03: `Attendance` Model Has No Unique Constraint on `(employeeId, date)`

**What our `DATABASE_SCHEMA.md` says:**
> "Unique constraint on `(employeeId, date)` to prevent duplicate attendance."

**What `attendanceModel.js` actually has:**
- No `indexes` array.
- No `unique: true` on any field or combination.

**Impact:** 🔴 HIGH — Right now the database will happily accept two clock-in records for the same employee on the same day. Our edge case EC-11 says this should be blocked. It currently is NOT blocked at the DB level.

---

### GAP-04: The `Employee` Model's `role` ENUM Doesn't Match Our Docs

**What our `PROJECT_CONTEXT.md` says about Employee:**
> `role`: ENUM(`cashier`, `kitchen`)

**What `employeeModel.js` actually has:**
```javascript
role: { type: DataTypes.ENUM('cashier', 'kitchen'), ... }
```
This part is actually correct ✅.

However — our docs also say the **Employee** model has an `assignedStationId` FK to `KitchenStation`, but there is **no Sequelize association defined** for `Employee → KitchenStation` in `models/index.js` (lines 65-70 only define Employee ↔ Attendance and Employee ↔ Payroll).

**Impact:** 🟡 LOW — Won't affect payroll directly, but it's a gap in the docs.

---

### GAP-05: `BusinessHours` Table Gives Us A Pattern We Missed

**What we missed:**
The existing `businessHoursModel.js` + `/api/business-hours` route is **exactly** the same pattern as our proposed `PayrollConfigs` table — a settings/config table that the admin can update. We should study this existing implementation and mirror its patterns exactly for `PayrollConfigs` instead of inventing a new approach.

**Impact:** 🟡 MEDIUM — Our plan should explicitly reference this pattern. This makes implementation easier and more consistent.

---

### GAP-06: The `Employees.tsx` Page Calls `usersAPI`, Not an `employeesAPI`

**What we found:**
The existing "Employees" admin page (`Employees.tsx` line 3) uses `usersAPI.getPending()` and `usersAPI.getApproved()`. This means the admin "Employees" page is actually managing **`User` accounts**, not `Employee` records.

**Impact:** 🔴 HIGH — This is a critical insight. The `Employee` model (with `hourlyRate`, `joinDate`, etc.) may have its own separate routes. We need to find or create the employee-specific API to understand what `Employee` records look like to the frontend before we build the payroll page on top of them.

---

## 🔵 ENHANCEMENTS — What We Should Add To Our Plan

### REC-01: Study `businessHoursModel.js` Before Building `PayrollConfigs`
It's the same concept. Read it, copy the pattern.

### REC-02: Create `requireAdmin` as a Reusable Middleware
Instead of inline role checks on every payroll route (like the existing code does), we should create a clean reusable `requireAdmin` middleware **once**, as documented in our plan. This improves the codebase even for non-payroll routes.

### REC-03: Add a `PayrollConfig Service` (Not Just a Table)
Our docs mention the `PayrollConfigs` table but not a service for it. We should add `services/payrollConfigService.js` that:
- Loads all configs from DB into memory on startup (cache them)
- Invalidates cache when admin updates a config
- Always provides a safe fallback default value

This prevents hitting the DB on every single payroll calculation.

### REC-04: Find the Employee Routes Before Coding
We confirmed there are **zero** payroll/attendance routes in `routes/index.js`, but the file is 2,891 lines. We need to search for the existing `Employee`-specific API endpoints to understand what already exists before we add more.

### REC-05: Fix `createLog()` Signature in All Docs Immediately
This is the most urgent fix before any coding starts. If our AI writes payroll code using the wrong logger signature, it will crash on first run.
