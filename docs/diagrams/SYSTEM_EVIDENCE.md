# JAPZ Payroll & Attendance Management System
## Comprehensive System Evidence Map & Architecture Inventory

**Student:** Aaron Jasper S. Agbas  
**Degree & Section:** BSIT 4F1 — Mindoro State University  
**Target System:** JAPZ Restaurant Management System (Mobile POS Platform)  
**Target Subsystem:** Individual Module — Payroll & Time/Attendance Management  
**Inspection Date:** 2026-10-15  
**Evidence Baseline:** Direct inspection of active repository source files, database migrations, controllers, services, models, tests, and user interfaces.

---

## 1. Domain Entities & Database Models

All database models use the Sequelize ORM (`sequelize.define`) with MySQL storage.

### 1.1 User (`japz-backend/models/userModel.js`)
- **Table Name:** `Users`
- **Primary Key:** `id` (INTEGER, autoIncrement)
- **Attributes:**
  - `name` (STRING, required)
  - `email` (STRING, required, unique)
  - `password` (STRING, required — bcrypt hashed)
  - `role` (ENUM: `'admin'`, `'cashier'`, `'kitchen'`, default: `'cashier'`)
  - `status` (ENUM: `'pending'`, `'approved'`, `'rejected'`, `'inactive'`, default: `'pending'`)
  - `assignedCategories` (JSON, array of category IDs for kitchen staff)
  - `hourlyRate` (DECIMAL(10,2), default: 75.00)
- **Relationships (`japz-backend/models/index.js`):**
  - `User.hasOne(Employee, { foreignKey: 'userId', as: 'employee' })`
  - `User.hasMany(Order, { foreignKey: 'cashierId', as: 'orders' })`
  - `User.hasMany(Order, { foreignKey: 'preparedById', as: 'preparedOrders' })`
  - `User.hasMany(PayrollPeriod, { foreignKey: 'createdBy', as: 'createdPeriods' })`
- **Role in Payroll Subsystem:** Authentication principal, JWT payload subject (`req.user`), administrative creator and approver of pay cycles, and initial source for staff accounts.

---

### 1.2 Employee (`japz-backend/models/employeeModel.js`)
- **Table Name:** `Employees`
- **Primary Key:** `id` (INTEGER, autoIncrement)
- **Attributes:**
  - `name` (STRING, required)
  - `email` (STRING, required, unique)
  - `phone` (STRING, required)
  - `password` (STRING, required)
  - `role` (ENUM: `'cashier'`, `'kitchen'`, default: `'cashier'`)
  - `joinDate` (DATEONLY, default: NOW)
  - `assignedStationId` (INTEGER, nullable)
  - `assignedCategories` (JSON, nullable)
  - `status` (ENUM: `'active'`, `'inactive'`, default: `'active'`)
  - `hourlyRate` (DECIMAL(10,2), default: 0.00)
  - `userId` (INTEGER, nullable — FK to Users)
  - `dailyAllowance` (DECIMAL(10,2), default: 0.00)
  - `monthlyAllowance` (DECIMAL(10,2), default: 0.00)
  - `overtimeAllowed` (BOOLEAN, default: true)
  - `sssExempt` (BOOLEAN, default: false)
  - `philhealthExempt` (BOOLEAN, default: false)
  - `pagibigExempt` (BOOLEAN, default: false)
  - `taxExempt` (BOOLEAN, default: false)
  - `customDeduction` (DECIMAL(10,2), default: 0.00)
- **Relationships (`japz-backend/models/index.js`):**
  - `Employee.belongsTo(User, { foreignKey: 'userId', as: 'user' })`
  - `Employee.hasMany(Attendance, { foreignKey: 'employeeId', as: 'attendances' })`
  - `Employee.hasMany(PayrollEntry, { foreignKey: 'employeeId', as: 'payrollEntries' })`
  - `Employee.hasMany(Payslip, { foreignKey: 'employeeId', as: 'payslips' })`
- **Role in Payroll Subsystem:** Primary staff wage profile containing base hourly rate, individual allowances, overtime permission, and statutory deduction flags.

---

### 1.3 Attendance (`japz-backend/models/attendanceModel.js`)
- **Table Name:** `Attendances`
- **Primary Key:** `id` (INTEGER, autoIncrement)
- **Attributes:**
  - `employeeId` (INTEGER, required — FK to Employees)
  - `date` (DATEONLY, required — calendar date of shift start)
  - `clockIn` (DATE / DATETIME, nullable — full timestamp supporting overnight shifts)
  - `clockOut` (DATE / DATETIME, nullable — full timestamp)
  - `totalHours` (DECIMAL(7,2), default: 0.00 — net of unpaid breaks)
  - `lateMinutes` (INTEGER, default: 0 — arrival after shiftStart + gracePeriod)
  - `undertimeMinutes` (INTEGER, default: 0 — early departure before shiftEnd)
  - `notes` (STRING, nullable — administrative correction remarks)
- **Indexes:**
  - Unique composite index: `['employeeId', 'date']` (Name: `unique_employee_date`)
- **Relationships (`japz-backend/models/index.js`):**
  - `Attendance.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' })`
- **Role in Payroll Subsystem:** Raw time-tracking punch logs evaluated by `AttendanceService` to feed verified regular and overtime hours into payroll calculations.

---

### 1.4 PayrollPeriod (`japz-backend/models/payrollPeriodModel.js`)
- **Table Name:** `payroll_periods`
- **Primary Key:** `id` (INTEGER, autoIncrement)
- **Attributes:**
  - `periodStart` (DATEONLY, required — start date of cycle)
  - `periodEnd` (DATEONLY, required — cutoff date of cycle)
  - `payDate` (DATEONLY, nullable — scheduled disbursement date)
  - `status` (ENUM: `'DRAFT'`, `'CALCULATED'`, `'UNDER_REVIEW'`, `'APPROVED'`, `'PAID'`, `'LOCKED'`, `'CANCELLED'`, default: `'DRAFT'`)
  - `description` (STRING, nullable — label e.g., "October 2026 Payroll")
  - `createdBy` (INTEGER, required — FK to Users.id)
  - `approvedBy` (INTEGER, nullable — FK to Users.id)
  - `approvedAt` (DATE, nullable)
  - `paidAt` (DATE, nullable)
  - `cancelReason` (TEXT, nullable — mandatory explanation if cancelled)
- **Indexes:**
  - Indexes on `status`, `periodStart`, `periodEnd`
- **Relationships (`japz-backend/models/index.js`):**
  - `PayrollPeriod.hasMany(PayrollEntry, { foreignKey: 'payrollPeriodId', as: 'entries' })`
  - `PayrollPeriod.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' })`
- **Role in Payroll Subsystem:** State-machine container controlling the 7-stage lifecycle of restaurant pay runs.

---

### 1.5 PayrollEntry (`japz-backend/models/payrollEntryModel.js`)
- **Table Name:** `payroll_entries`
- **Primary Key:** `id` (INTEGER, autoIncrement)
- **Attributes:**
  - `payrollPeriodId` (INTEGER, required — FK to PayrollPeriod)
  - `employeeId` (INTEGER, required — FK to Employee)
  - `snapshotEmployeeName` (STRING, required — historical snapshot)
  - `snapshotRole` (STRING, required — historical snapshot)
  - `snapshotHourlyRate` (DECIMAL(10,2), required — immutable historical rate)
  - `regularHours` (DECIMAL(7,2), default: 0.00)
  - `overtimeHours` (DECIMAL(7,2), default: 0.00)
  - `basicPay` (DECIMAL(10,2), default: 0.00 — rate × regularHours)
  - `overtimePay` (DECIMAL(10,2), default: 0.00 — rate × OT_multiplier × overtimeHours)
  - `holidayPay` (DECIMAL(10,2), default: 0.00)
  - `restDayPay` (DECIMAL(10,2), default: 0.00)
  - `allowances` (DECIMAL(10,2), default: 0.00)
  - `bonuses` (DECIMAL(10,2), default: 0.00)
  - `grossPay` (DECIMAL(10,2), default: 0.00 — sum of earnings)
  - `lateMinutes` (INTEGER, default: 0)
  - `undertimeMinutes` (INTEGER, default: 0)
  - `absenceDays` (DECIMAL(4,1), default: 0.0)
  - `lateDeduction` (DECIMAL(10,2), default: 0.00 — (rate / 60) × lateMinutes)
  - `undertimeDeduction` (DECIMAL(10,2), default: 0.00 — (rate / 60) × undertimeMinutes)
  - `absenceDeduction` (DECIMAL(10,2), default: 0.00 — (rate × regularHoursPerDay) × absenceDays)
  - `cashAdvanceDeduction` (DECIMAL(10,2), default: 0.00)
  - `otherDeductions` (DECIMAL(10,2), default: 0.00)
  - `totalDeductions` (DECIMAL(10,2), default: 0.00 — sum of deductions)
  - `netPay` (DECIMAL(10,2), default: 0.00 — grossPay - totalDeductions, always >= 0)
  - `status` (ENUM: `'DRAFT'`, `'CALCULATED'`, `'APPROVED'`, default: `'DRAFT'`)
  - `notes` (TEXT, nullable)
  - `calculatedAt` (DATE, nullable)
  - `calculatedBy` (INTEGER, nullable — FK to Users.id)
- **Indexes:**
  - Unique composite index: `['payrollPeriodId', 'employeeId']` (Name: `unique_period_employee`)
- **Relationships (`japz-backend/models/index.js`):**
  - `PayrollEntry.belongsTo(PayrollPeriod, { foreignKey: 'payrollPeriodId', as: 'payrollPeriod' })`
  - `PayrollEntry.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' })`
  - `PayrollEntry.hasOne(Payslip, { foreignKey: 'payrollEntryId', as: 'payslip' })`
  - `PayrollEntry.hasMany(PayrollAdjustment, { foreignKey: 'payrollEntryId', as: 'adjustments' })`
- **Role in Payroll Subsystem:** Deterministic line-item wage snapshot preserving historical financial values against future rate changes.

---

### 1.6 PayrollAdjustment (`japz-backend/models/payrollAdjustmentModel.js`)
- **Table Name:** `payroll_adjustments`
- **Primary Key:** `id` (INTEGER, autoIncrement)
- **Attributes:**
  - `payrollEntryId` (INTEGER, required — FK to PayrollEntry)
  - `adjustmentType` (ENUM: `'earning'`, `'deduction'`, required)
  - `description` (STRING, required)
  - `amount` (DECIMAL(10,2), required — always positive)
  - `reason` (TEXT, required — mandatory written audit reason)
  - `createdBy` (INTEGER, required — FK to Users.id)
- **Relationships (`japz-backend/models/index.js`):**
  - `PayrollAdjustment.belongsTo(PayrollEntry, { foreignKey: 'payrollEntryId', as: 'payrollEntry' })`
- **Role in Payroll Subsystem:** Post-PAID financial adjustment audit mechanism ensuring original locked payroll records remain immutable.

---

### 1.7 Payslip (`japz-backend/models/payslipModel.js`)
- **Table Name:** `payslips`
- **Primary Key:** `id` (INTEGER, autoIncrement)
- **Attributes:**
  - `payrollEntryId` (INTEGER, required, unique — 1-to-1 with PayrollEntry)
  - `employeeId` (INTEGER, required — denormalized FK to Employee)
  - `generatedAt` (DATE, default: NOW)
  - `generatedBy` (INTEGER, required — FK to Users.id)
  - `isSuperseded` (BOOLEAN, default: false — flagged if parent period was reopened)
- **Relationships (`japz-backend/models/index.js`):**
  - `Payslip.belongsTo(PayrollEntry, { foreignKey: 'payrollEntryId', as: 'payrollEntry' })`
  - `Payslip.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' })`
- **Role in Payroll Subsystem:** Formal remittance advice and printable payslip document accessible by authenticated staff.

---

### 1.8 PayrollConfig (`japz-backend/models/payrollConfigModel.js`)
- **Table Name:** `payroll_configs`
- **Primary Key:** `id` (INTEGER, autoIncrement)
- **Attributes:**
  - `configKey` (STRING, required, unique)
  - `configValue` (STRING, required)
  - `description` (STRING, nullable)
  - `updatedBy` (INTEGER, nullable — FK to Users.id)
- **Standard Dynamic Keys & Defaults (`payrollConfigService.js`):**
  - `regularHoursPerDay`: `"8"` (hours)
  - `gracePeriodMinutes`: `"5"` (minutes)
  - `overtimeMultiplier`: `"1.25"` (125%)
  - `restDayMultiplier`: `"1.30"` (130%)
  - `breakMinutes`: `"60"` (unpaid break minutes)
  - `workingDays`: `"1,2,3,4,5,6"` (Mon-Sat, 0=Sun)
  - `deductAbsenceDailyRate`: `"false"` (Hourly "No Work No Pay" vs Salary daily rate deduction)
- **Role in Payroll Subsystem:** Admin-editable operational parameters with in-memory caching to eliminate hardcoded calculation numbers.

---

### 1.9 Order (`japz-backend/models/orderModel.js`)
- **Table Name:** `Orders`
- **Attributes (Relevant):** `id`, `orderNumber`, `cashierId`, `total`, `status`, `completedAt`, `createdAt`
- **Role in Payroll Subsystem:** Read-only sales revenue source used by `PayrollReportService` to calculate restaurant **Labor Cost-to-Sales Ratios** (`(Gross Payroll / Completed Sales) × 100`).

---

### 1.10 Log (`japz-backend/models/logModel.js`)
- **Table Name:** `Logs`
- **Attributes:** `userId`, `userName`, `action`, `module`, `entityId`, `entityType`, `description`, `changes` (JSON), `ipAddress`, `status`, `errorMessage`
- **Role in Payroll Subsystem:** Cross-cutting immutable audit trail for clock-in/outs, period recalculations, administrative adjustments, status transitions, and config updates.

---

## 2. Business Services & Calculation Engines

### 2.1 `PayrollCalculator.js` (`japz-backend/services/payrollCalculator.js`)
- **Classification:** Pure Mathematical Function (Isolated Engine)
- **Characteristics:**
  - Zero database queries (`findAll`, `create`, `update` do not exist).
  - Zero side effects; deterministic (identical input parameters always yield identical return values).
  - Enforces `roundMoney()` (`Math.round(val * 100) / 100`) at every monetary step.
  - Enforces non-negative net pay: `netPay = roundMoney(Math.max(0, grossPay - totalDeductions))`.
- **Core Functions:**
  - `roundMoney(value)`
  - `toDecimalHours(ms)`
  - `hoursToMinutes(decimalHours)`
  - `aggregateAttendance(attendanceRecords, config)`
  - `countAbsentDays(periodStart, periodEnd, attendanceDates, workingDays, asOfDate)`
  - `calculatePayrollEntry(employeeSnapshot, payrollPeriod, attendanceRecords, config, extras)`
- **Verification:** Tested by 27 unit tests in `japz-backend/__tests__/payrollCalculator.test.js` (100% pass rate).

---

### 2.2 `PayrollService.js` (`japz-backend/services/payrollService.js`)
- **Classification:** Domain Orchestration Service
- **Characteristics:**
  - Enforces atomic multi-table writes using `sequelize.transaction()`.
  - Enforces state transition guard (`VALID_TRANSITIONS` map).
  - Automatically writes audit log entries via `createLog()`.
- **Exported Operations:**
  - `createPayrollPeriod(periodStart, periodEnd, description, adminUser)`
  - `calculatePayroll(periodId, adminUser)`
  - `markUnderReview(periodId, adminUser)`
  - `approvePayroll(periodId, adminUser)`
  - `markPayrollPaid(periodId, adminUser)`
  - `lockPayroll(periodId, adminUser)`
  - `reopenPayroll(periodId, reason, adminUser)`
  - `cancelPayroll(periodId, reason, adminUser)`
  - `generatePayslips(periodId, adminUser)`
  - `addAdjustment(entryId, adjustmentData, adminUser)`
  - `getEntryById(entryId)`
  - `getAllPeriods()`
  - `getPeriodById(periodId)`
  - `getMyPayslips(userId)`

---

### 2.3 `AttendanceService.js` (`japz-backend/services/attendanceService.js`)
- **Classification:** Time & Attendance Management Service
- **Characteristics:**
  - Validates punches against shift schedules, grace periods, and break rules.
  - Detects missing clock-ins / clock-outs for pre-payroll validation.
  - Enforces one attendance record per employee per calendar date (`unique_employee_date`).
- **Exported Operations:**
  - `clockIn(employeeId, clockInTime, req)`
  - `clockOut(employeeId, clockOutTime, req)`
  - `getAttendanceForPeriod(employeeId, startDate, endDate)`
  - `getAttendanceValidationReport(periodStart, periodEnd)`
  - `adminCorrectAttendance(attendanceId, data, adminUser, req)`
  - `getAttendanceRecords(filters)`

---

### 2.4 `PayrollConfigService.js` (`japz-backend/services/payrollConfigService.js`)
- **Classification:** Configuration Management Service
- **Characteristics:**
  - In-memory cache (`configCache`) invalidated immediately upon config update.
  - Safe automatic seeding on startup via `seedDefaultConfigs()`.
- **Exported Operations:**
  - `seedDefaultConfigs()`
  - `getPayrollConfig()`
  - `getAllConfigRows()`
  - `updateConfig(configKey, configValue, updatedByUserId, updatedByUserName)`
  - `invalidateConfigCache()`

---

### 2.5 `PayrollReportService.js` (`japz-backend/services/payrollReportService.js`)
- **Classification:** Financial Analytics & Export Service
- **Characteristics:**
  - Integrates completed POS order totals with period gross labor costs.
  - Generates RFC 4180 compliant CSV export files.
- **Exported Operations:**
  - `getPayrollAnalytics({ periodId, year })`
  - `generatePeriodCSV(periodId)`

---

### 2.6 `EmployeePayrollService.js` (`japz-backend/services/employeePayrollService.js`)
- **Classification:** Employee Pay Configuration & Sync Service
- **Characteristics:**
  - Synchronizes user records (`role='cashier'|'kitchen'`, `status='approved'`) into `Employee` wage profiles.
  - Updates per-employee allowances, tax exemptions, and custom deductions.
- **Exported Operations:**
  - `getAllEmployees()`
  - `getActiveEmployeeCount()`
  - `updateEmployeePayConfig(employeeId, configData, adminUser, req)`
  - `syncEmployeesFromUsers(adminUser, req)`

---

## 3. Web API Endpoints & Middleware Architecture

### 3.1 Security Middleware (`japz-backend/routes/index.js`)
- `verifyToken`: Validates incoming `Authorization: Bearer <JWT>` header using `jsonwebtoken` against `JWT_SECRET`. Attaches decoded claims to `req.user`.
- `requireAdmin`: Role guard inspecting `req.user.role === 'admin'`. Returns HTTP 403 Forbidden for unauthorized requests. Mounted on `/api/payroll/*` and `/api/payroll-reports/*`.

### 3.2 Route Tables
| HTTP Verb | Route Path | Controller Function | Auth Guard | Description |
|---|---|---|---|---|
| `POST` | `/api/employee/clock-in` | `clockIn` | `verifyToken` | Staff shift clock-in |
| `POST` | `/api/employee/clock-out` | `clockOut` | `verifyToken` | Staff shift clock-out |
| `GET` | `/api/employee/payslips` | `getMyPayslips` | `verifyToken` | Personal payslips for authenticated staff |
| `GET` | `/api/payroll/config` | `getPayrollConfigs` | `requireAdmin` | Retrieve dynamic payroll rules |
| `PUT` | `/api/payroll/config/:configKey` | `updatePayrollConfig` | `requireAdmin` | Update dynamic rule value |
| `GET` | `/api/payroll/periods` | `getAllPeriods` | `requireAdmin` | List all pay cycles |
| `POST` | `/api/payroll/periods` | `createPeriod` | `requireAdmin` | Open a new pay period in DRAFT |
| `GET` | `/api/payroll/periods/:id` | `getPeriodById` | `requireAdmin` | Fetch pay period detail with entries |
| `POST` | `/api/payroll/periods/:id/calculate` | `calculatePayroll` | `requireAdmin` | Run deterministic calculation |
| `PUT` | `/api/payroll/periods/:id/review` | `markUnderReview` | `requireAdmin` | Move status to UNDER_REVIEW |
| `PUT` | `/api/payroll/periods/:id/approve` | `approvePayroll` | `requireAdmin` | Freeze entries and set to APPROVED |
| `PUT` | `/api/payroll/periods/:id/paid` | `markPaid` | `requireAdmin` | Set status to PAID |
| `PUT` | `/api/payroll/periods/:id/lock` | `lockPayroll` | `requireAdmin` | Permanently lock period (LOCKED) |
| `PUT` | `/api/payroll/periods/:id/reopen` | `reopenPayroll` | `requireAdmin` | Reopen APPROVED period (requires reason) |
| `PUT` | `/api/payroll/periods/:id/cancel` | `cancelPayroll` | `requireAdmin` | Cancel period (requires reason) |
| `POST` | `/api/payroll/periods/:id/payslips` | `generatePayslips` | `requireAdmin` | Generate employee payslips |
| `GET` | `/api/payroll/periods/:id/validate` | `getAttendanceValidationReport` | `requireAdmin` | Pre-calculation attendance check |
| `GET` | `/api/payroll/entries/:id` | `getEntryById` | `requireAdmin` | View single entry details |
| `POST` | `/api/payroll/entries/:id/adjust` | `addAdjustment` | `requireAdmin` | Add post-PAID adjustment |
| `GET` | `/api/attendance/records` | `getAttendanceRecords` | `requireAdmin` | Query attendance logs with filters |
| `PUT` | `/api/attendance/:id/correct` | `correctAttendance` | `requireAdmin` | Administrative punch correction |
| `GET` | `/api/payroll/employees` | `getAllEmployees` | `requireAdmin` | List staff with wage parameters |
| `PUT` | `/api/payroll/employees/:id/pay-config` | `updateEmployeePayConfig` | `requireAdmin` | Update individual employee pay rates |
| `POST` | `/api/payroll/employees/sync` | `syncEmployeesFromUsers` | `requireAdmin` | Synchronize POS users to employees |
| `GET` | `/api/payroll/reports/analytics` | `getPayrollAnalytics` | `requireAdmin` | Period labor analytics vs POS sales |
| `GET` | `/api/payroll/periods/:id/export/csv` | `exportPeriodCSV` | `requireAdmin` | Download period CSV ledger |

---

## 4. Client User Interface (React 19 + TypeScript + Vite)

### 4.1 Admin Interfaces (`japz-web/src/pages/admin/`)
- `PayrollDashboard.tsx`: Central hub displaying active pay cycles, status badges, period creation modal, and financial overview metrics.
- `PayrollPeriodDetail.tsx`: Period management view offering action triggers (`Calculate`, `Review`, `Approve`, `Mark Paid`, `Lock`, `Reopen`, `Generate Payslips`, `Export CSV`), employee entries table, and adjustment modal.
- `AttendanceManagement.tsx`: Comprehensive shift tracking interface with pre-payroll issue validation (missing clock-ins/outs), punch filters, and punch edit modal.
- `PayrollReports.tsx`: Labor cost analytics dashboard displaying gross pay vs POS completed sales ratios, role breakdowns, and multi-period trends.
- `PayrollSettings.tsx`: Configuration portal for dynamic payroll parameters (grace period, OT multiplier, unpaid breaks, working days).
- `StaffPayManagement.tsx`: Staff wage administration view with POS user sync trigger, hourly rate inputs, allowance controls, and statutory exemption toggles.

### 4.2 Staff Self-Service Interfaces (`japz-web/src/pages/employee/`)
- `ClockInOut.tsx`: Interactive punch widget for Cashier and Kitchen staff with live shift duration timer and on-time/grace indicator.
- `MyPayslips.tsx`: Personal remittance advice viewer allowing staff to inspect earnings breakdown, deductions, and print/download official payslips.

---

## 5. Deployment & Runtime Environment

- **Frontend Client:** React 19, TypeScript 5.9, Vite 7.3, TailwindCSS 3.4. Executed in user web browser (Google Chrome, Firefox, Mobile Safari/Chrome).
- **Backend API Server:** Node.js (>=18.0.0), Express 4.19, Sequelize 6.37. Executed in local development via Nodemon / Node or deployed in cloud container (Railway / Linux VM) listening on port 3000 / 5000.
- **Database Engine:** MySQL 8.0 running on localhost:3306 (Laragon development environment) or managed Railway MySQL cloud database with TLS/SSL encryption.
- **Communication Protocol:** JSON over HTTP/1.1 or HTTPS (TLS 1.3), JWT Bearer token authentication in `Authorization` header.
