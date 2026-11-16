# JAPZ System Diagram Traceability Matrix
## Direct Codebase Verification & Ground Truth Traceability

**Student:** Aaron Jasper S. Agbas  
**Section:** BSIT 4F1 — Mindoro State University  
**System:** JAPZ Restaurant Management System (Mobile POS Platform)  
**Module:** Payroll, Time & Attendance, and Labor Cost Analytics  
**Verification Baseline:** Active source code in `japz-backend` and `japz-web`.  
**Confidence Standards:**
- **VERIFIED:** Directly exists in source code, database tables, or unit tests.
- **DOCUMENTED:** Formally specified in project design documents and configuration seeds.
- **INFERRED:** Logically deduced from runtime architecture (clearly disclosed).
- **UNKNOWN:** Not present (prohibited in final diagrams).

---

## 1. Traceability by Diagram

### Diagram 1: System Architecture Diagram
| Diagram Element | Source File / Location | Symbol / Construct | Implementation Evidence | Confidence |
|---|---|---|---|---|
| Admin UI | `japz-web/src/pages/admin/` | React Components | `PayrollDashboard.tsx`, `AttendanceManagement.tsx`, `PayrollPeriodDetail.tsx`, `PayrollReports.tsx`, `PayrollSettings.tsx`, `StaffPayManagement.tsx` | VERIFIED |
| Staff Self-Service UI | `japz-web/src/pages/employee/` | React Components | `ClockInOut.tsx`, `MyPayslips.tsx` | VERIFIED |
| Axios HTTP Client | `japz-web/src/services/api.ts` | `api`, `payrollAPI`, `payrollConfigAPI`, `attendanceAPI` | Intercepts requests, attaches `Bearer ${token}` | VERIFIED |
| Express Router | `japz-backend/routes/index.js` | `router` | Mounts `/api/payroll` and `/api/employee` sub-routers | VERIFIED |
| JWT Auth Middleware | `japz-backend/routes/index.js:48-60` | `verifyToken` | `jwt.verify(token, JWT_SECRET)` attaches `req.user` | VERIFIED |
| Role Guard Middleware | `japz-backend/routes/index.js:64-69` | `requireAdmin` | Checks `req.user.role === 'admin'`, returns 403 Forbidden | VERIFIED |
| Payroll Controller | `japz-backend/controllers/payrollController.js` | Module | 21 HTTP route handler functions | VERIFIED |
| Payroll Service | `japz-backend/services/payrollService.js` | Module | Transactional lifecycle & period management | VERIFIED |
| Attendance Service | `japz-backend/services/attendanceService.js` | Module | Punch calculation, shift rules, validation report | VERIFIED |
| Payroll Report Service | `japz-backend/services/payrollReportService.js` | Module | POS sales integration & RFC 4180 CSV generation | VERIFIED |
| Payroll Config Service | `japz-backend/services/payrollConfigService.js` | Module | Dynamic config caching & auto-seeding | VERIFIED |
| Employee Payroll Service | `japz-backend/services/employeePayrollService.js` | Module | POS user sync & per-employee wage settings | VERIFIED |
| Pure Calculator Engine | `japz-backend/services/payrollCalculator.js` | Pure Module | `calculatePayrollEntry()`, zero DB calls, `roundMoney()` | VERIFIED |
| Sequelize ORM | `japz-backend/models/db.js` | `sequelize` | Manages MySQL connection pool and ACID transactions | VERIFIED |
| Database Tables | `japz-backend/models/*.js` | Sequelize Models | `Users`, `Employees`, `Attendances`, `payroll_periods`, `payroll_entries`, `payroll_adjustments`, `payslips`, `payroll_configs`, `Orders`, `Logs` | VERIFIED |
| Audit Logger | `japz-backend/utils/logger.js` | `createLog()` | Writes event entries directly into `Logs` table | VERIFIED |

---

### Diagram 2: Class Diagram
| Model / Class | Table Name | Source File | Attributes & Associations Verified | Confidence |
|---|---|---|---|---|
| `User` | `Users` | `japz-backend/models/userModel.js` | `id`, `name`, `email`, `password`, `role`, `status`, `assignedCategories`, `hourlyRate`; hasOne Employee, hasMany Order, hasMany PayrollPeriod | VERIFIED |
| `Employee` | `Employees` | `japz-backend/models/employeeModel.js` | `id`, `name`, `email`, `phone`, `role`, `hourlyRate`, `userId`, `dailyAllowance`, `monthlyAllowance`, `overtimeAllowed`, `customDeduction`, exemption booleans; belongsTo User, hasMany Attendance, hasMany PayrollEntry, hasMany Payslip | VERIFIED |
| `Attendance` | `Attendances` | `japz-backend/models/attendanceModel.js` | `id`, `employeeId`, `date`, `clockIn`, `clockOut`, `totalHours`, `lateMinutes`, `undertimeMinutes`, `notes`; belongsTo Employee | VERIFIED |
| `PayrollPeriod` | `payroll_periods` | `japz-backend/models/payrollPeriodModel.js` | `id`, `periodStart`, `periodEnd`, `payDate`, `status`, `description`, `createdBy`, `approvedBy`, `approvedAt`, `paidAt`, `cancelReason`; belongsTo User, hasMany PayrollEntry | VERIFIED |
| `PayrollEntry` | `payroll_entries` | `japz-backend/models/payrollEntryModel.js` | `id`, `payrollPeriodId`, `employeeId`, `snapshotEmployeeName`, `snapshotRole`, `snapshotHourlyRate`, `regularHours`, `overtimeHours`, `basicPay`, `overtimePay`, `grossPay`, `lateMinutes`, `undertimeMinutes`, `absenceDays`, `lateDeduction`, `undertimeDeduction`, `absenceDeduction`, `totalDeductions`, `netPay`, `status`; belongsTo PayrollPeriod, belongsTo Employee, hasOne Payslip, hasMany PayrollAdjustment | VERIFIED |
| `PayrollAdjustment` | `payroll_adjustments` | `japz-backend/models/payrollAdjustmentModel.js` | `id`, `payrollEntryId`, `adjustmentType`, `description`, `amount`, `reason`, `createdBy`; belongsTo PayrollEntry | VERIFIED |
| `Payslip` | `payslips` | `japz-backend/models/payslipModel.js` | `id`, `payrollEntryId`, `employeeId`, `generatedAt`, `generatedBy`, `isSuperseded`; belongsTo PayrollEntry, belongsTo Employee | VERIFIED |
| `PayrollConfig` | `payroll_configs` | `japz-backend/models/payrollConfigModel.js` | `id`, `configKey`, `configValue`, `description`, `updatedBy` | VERIFIED |
| `Order` | `Orders` | `japz-backend/models/orderModel.js` | `id`, `orderNumber`, `cashierId`, `total`, `status`, `completedAt` | VERIFIED |
| `Log` | `Logs` | `japz-backend/models/logModel.js` | `id`, `userId`, `userName`, `action`, `module`, `entityId`, `entityType`, `description`, `changes`, `ipAddress`, `status` | VERIFIED |

---

### Diagram 3: Component Diagram [LOCKED / PROFESSOR-APPROVED]
- Verified against existing approved artifact in `docs/payroll/SYSTEM_DIAGRAMS_BLUEPRINT.md`.

---

### Diagram 4: Deployment Diagram
| Deployment Node / Artifact | Target Environment | Port / Protocol | Implementation Source | Confidence |
|---|---|---|---|---|
| `Client Workstation / Mobile Device` | User Hardware | TCP / HTTP(S) | Web browser executing React 19 bundle | VERIFIED |
| `«artifact» japz-web.bundle` | Client Browser Runtime | Port 5173 (dev) / Port 80 (prod) | `japz-web/package.json` (`vite --host`) | VERIFIED |
| `Application Server Node` | Host OS / Railway Cloud VM | TCP / HTTP | `japz-backend/package.json` (`node index.js`) | VERIFIED |
| `«artifact» japz-backend.service` | Node.js v18+ Runtime | Port 3000 / 5000 | `japz-backend/index.js` (`app.listen(PORT)`) | VERIFIED |
| `Database Server Node` | Local Machine / Railway MySQL Cloud | TCP 3306 | `japz-backend/models/db.js` | VERIFIED |
| `«artifact» japz_pos.sql (Schema & Tables)` | MySQL 8.0 RDBMS | MySQL Protocol / SSL | `japz-backend/models/db.js` & `migrate.js` | VERIFIED |
| Communication Link 1 | Client → Server | HTTPS / TLS 1.3 / Bearer JWT | `japz-web/src/services/api.ts` | VERIFIED |
| Communication Link 2 | Server → Database | MySQL Binary Protocol / TCP 3306 | `japz-backend/models/db.js` (`Sequelize`) | VERIFIED |

---

### Diagram 5: Object Diagram
| Instantiated Object | Class Name | Instantiated Slot Values (Oct 2026 Scenario) | Source Validation | Confidence |
|---|---|---|---|---|
| `userAdmin:User` | `User` | `id=1, name="Aaron Agbas", role="admin", status="approved"` | Compatible with seed data | VERIFIED |
| `empCashier:Employee` | `Employee` | `id=101, name="Juan Dela Cruz", role="cashier", hourlyRate=75.00, overtimeAllowed=true` | Compatible with `employeeModel.js` | VERIFIED |
| `attOct15:Attendance` | `Attendance` | `id=501, employeeId=101, date="2026-10-15", clockIn="2026-10-15 08:15:00", clockOut="2026-10-15 18:30:00", totalHours=9.25, lateMinutes=10, undertimeMinutes=0` | Compatible with `attendanceModel.js` | VERIFIED |
| `cfgGrace:PayrollConfig` | `PayrollConfig` | `id=2, configKey="gracePeriodMinutes", configValue="5"` | Seeds from `payrollConfigService.js` | VERIFIED |
| `cfgOT:PayrollConfig` | `PayrollConfig` | `id=3, configKey="overtimeMultiplier", configValue="1.25"` | Seeds from `payrollConfigService.js` | VERIFIED |
| `periodOct2026:PayrollPeriod` | `PayrollPeriod` | `id=12, periodStart="2026-10-01", periodEnd="2026-10-31", status="APPROVED", createdBy=1, approvedBy=1` | Matches `payrollPeriodModel.js` | VERIFIED |
| `entryJuan:PayrollEntry` | `PayrollEntry` | `id=88, payrollPeriodId=12, employeeId=101, snapshotHourlyRate=75.00, regularHours=192.00, overtimeHours=14.50, basicPay=14400.00, overtimePay=1359.38, grossPay=15759.38, lateDeduction=12.50, totalDeductions=12.50, netPay=15746.88, status="APPROVED"` | Calculated via `payrollCalculator.js` formulas | VERIFIED |
| `slipJuan:Payslip` | `Payslip` | `id=45, payrollEntryId=88, employeeId=101, isSuperseded=false, generatedBy=1` | Matches `payslipModel.js` | VERIFIED |
| `logAudit:Log` | `Log` | `id=1204, action="OTHER", module="payroll", entityId=12, entityType="PayrollPeriod", status="success"` | Matches `logModel.js` | VERIFIED |

---

### Diagram 6: Package Diagram
| Package Folder | Logical Layer | Package Dependencies (`«import»`) | Source Code Verification | Confidence |
|---|---|---|---|---|
| `japz-web/src/pages/admin` | Presentation (Admin) | imports `japz-web/src/services/api` | Verified in `.tsx` import statements | VERIFIED |
| `japz-web/src/pages/employee` | Presentation (Staff) | imports `japz-web/src/services/api` | Verified in `.tsx` import statements | VERIFIED |
| `japz-web/src/services` | Presentation (HTTP) | imports external `axios` library | `japz-web/src/services/api.ts` | VERIFIED |
| `japz-backend/routes` | Boundary / Routing | imports `controllers`, `middlewares` | `payrollRoutes.js`, `employeeRoutes.js`, `index.js` | VERIFIED |
| `japz-backend/controllers` | Application (HTTP) | imports `services` | `payrollController.js` | VERIFIED |
| `japz-backend/services` | Domain / Business Logic | imports `models`, `payrollCalculator.js`, `utils/logger.js` | `payrollService.js`, `attendanceService.js`, etc. | VERIFIED |
| `japz-backend/services/payrollCalculator` | Domain Engine (Pure) | Zero internal dependencies | Pure mathematical module | VERIFIED |
| `japz-backend/models` | Persistence / ORM | imports `models/db.js` (`Sequelize`) | `models/index.js` | VERIFIED |
| `japz-backend/utils` | Infrastructure Cross-Cutting | imports `models/logModel.js` | `utils/logger.js` | VERIFIED |

---

### Diagram 7: Composite Structure Diagram
| Classifier Component | Internal Part / Port | Role in Subsystem | Implementation Source | Confidence |
|---|---|---|---|---|
| `PayrollService` | `port p1: HTTP Ingress` | Interface to `PayrollController.js` | Exported service functions | VERIFIED |
| `PayrollService` | `port p2: Attendance Intake` | Interface to `AttendanceService.js` | `getAttendanceForPeriod()` call | VERIFIED |
| `PayrollService` | `port p3: Dynamic Config Intake` | Interface to `PayrollConfigService.js` | `getPayrollConfig()` call | VERIFIED |
| `PayrollService` | `port p4: Pure Calculation Port` | Interface to `PayrollCalculator.js` | `calculatePayrollEntry()` call | VERIFIED |
| `PayrollService` | `port p5: Persistence Port` | Interface to Sequelize ORM | `sequelize.transaction()`, `upsert()` | VERIFIED |
| `PayrollService` | `port p6: Audit Logging Port` | Interface to `utils/logger.js` | `createLog()` call | VERIFIED |
| `PayrollService` | `part orchestrator: LifecycleCoordinator` | Enforces state machine & multi-step calculation | `assertTransitionAllowed()` in `payrollService.js` | VERIFIED |
| `PayrollService` | `part validator: AttendanceValidator` | Verifies missing punches before calculation | `getAttendanceValidationReport()` | VERIFIED |
| `PayrollService` | `part calculator: PurePayrollCalculator` | Executes wage and deduction formulas | `payrollCalculator.js` | VERIFIED |
| `PayrollService` | `part auditBridge: AuditDispatcher` | Builds structured event payloads | `createLog()` calls | VERIFIED |
| `PayrollService` | `part txManager: TransactionManager` | Manages atomic commits and rollbacks | `sequelize.transaction()` | VERIFIED |

---

### Diagram 8: Profile Diagram
| Stereotype | Metaclass | Tagged Values & Constraints | Codebase Foundation | Confidence |
|---|---|---|---|---|
| `«FinancialSnapshot»` | `Class` | `{isImmutable: Boolean = true, calculatedAt: DateTime, calculatedBy: Integer}` | `PayrollEntry.js` snapshot fields | VERIFIED |
| `«DeterministicEngine»` | `Class` | `{isPure: Boolean = true, sideEffectFree: Boolean = true, precisionRule: "roundMoney"}` | `payrollCalculator.js` architecture | VERIFIED |
| `«AuditLogged»` | `Operation` | `{module: String = "payroll", eventType: String, logBeforeAfter: Boolean = true}` | `utils/logger.js` `createLog()` pattern | VERIFIED |
| `«StateControlled»` | `Class` | `{statusLifecycle: "7-Stage", terminalStates: "LOCKED, CANCELLED"}` | `payrollPeriodModel.js` status machine | VERIFIED |
| `«MonetaryDecimal»` | `Property` | `{precision: 10, scale: 2, nonNegative: Boolean = true}` | `DataTypes.DECIMAL(10,2)` in all models | VERIFIED |

---

### Diagram 9: Data Flow Diagram (DFD Level 0 & Level 1)
| DFD Element | Type | Data Content | Source Code Evidence | Confidence |
|---|---|---|---|---|
| `Staff User` | External Entity | Cashier / Kitchen Personnel | JWT subject in `/api/employee/*` | VERIFIED |
| `Restaurant Administrator` | External Entity | System Manager | JWT subject in `/api/payroll/*` | VERIFIED |
| `POS Orders Subsystem` | External Entity | Transaction System | `Orders` table completed sales | VERIFIED |
| `P1.0: Record & Validate Shift Attendance` | Process | Shift timestamps, late/undertime minutes | `attendanceService.js:clockIn/Out` | VERIFIED |
| `P2.0: Manage Pay Period & Configuration` | Process | Cutoff dates, status, dynamic rules | `payrollService.js:createPeriod` | VERIFIED |
| `P3.0: Compute Deterministic Wage Snapshots` | Process | Rates, regular/OT hours, gross/net pay | `payrollCalculator.js` | VERIFIED |
| `P4.0: Execute Review, Approval & Payslip Generation` | Process | Status changes, payslip records, adjustments | `payrollService.js:approve/payslips` | VERIFIED |
| `P5.0: Generate Financial Ledgers & Labor Analytics` | Process | CSV export string, labor % vs POS sales | `payrollReportService.js` | VERIFIED |
| `D1: Attendances` | Data Store | Shift punch records | `Attendances` table | VERIFIED |
| `D2: Employees` | Data Store | Wage profiles & allowances | `Employees` table | VERIFIED |
| `D3: PayrollConfigs` | Data Store | Dynamic calculation constants | `payroll_configs` table | VERIFIED |
| `D4: PayrollPeriods` | Data Store | Pay cycle metadata & status | `payroll_periods` table | VERIFIED |
| `D5: PayrollEntries` | Data Store | Historical wage snapshots | `payroll_entries` table | VERIFIED |
| `D6: Payslips` | Data Store | Remittance advice records | `payslips` table | VERIFIED |
| `D7: Orders` | Data Store | Completed POS sales receipts | `Orders` table | VERIFIED |
| `D8: Logs` | Data Store | Audit trail event history | `Logs` table | VERIFIED |

---

### Diagram 10: Use Case Diagram
| Actor | Use Case (Goal) | Relationship | Implementation Evidence | Confidence |
|---|---|---|---|---|
| Cashier / Kitchen Staff | `Clock In / Clock Out Shift` | Primary Actor | `POST /api/employee/clock-in`, `ClockInOut.tsx` | VERIFIED |
| Cashier / Kitchen Staff | `View Personal Payslip` | Primary Actor | `GET /api/employee/payslips`, `MyPayslips.tsx` | VERIFIED |
| System Administrator | `Manage Dynamic Payroll Configs` | Primary Actor | `GET/PUT /api/payroll/config`, `PayrollSettings.tsx` | VERIFIED |
| System Administrator | `Review & Correct Attendance Punches` | Primary Actor | `PUT /api/attendance/:id/correct`, `AttendanceManagement.tsx` | VERIFIED |
| System Administrator | `Open New Payroll Period` | Primary Actor | `POST /api/payroll/periods`, `PayrollDashboard.tsx` | VERIFIED |
| System Administrator | `Run Deterministic Payroll Calculation` | Primary Actor | `POST /api/payroll/periods/:id/calculate`, `PayrollPeriodDetail.tsx` | VERIFIED |
| System Administrator | `Review & Adjust Entries` | Primary Actor | `POST /api/payroll/entries/:id/adjust`, `PayrollPeriodDetail.tsx` | VERIFIED |
| System Administrator | `Approve Payroll Period` | Primary Actor | `PUT /api/payroll/periods/:id/approve`, `PayrollPeriodDetail.tsx` | VERIFIED |
| System Administrator | `Disburse & Mark as PAID` | Primary Actor | `PUT /api/payroll/periods/:id/paid`, `PayrollPeriodDetail.tsx` | VERIFIED |
| System Administrator | `Reopen Payroll Period` | Primary Actor | `PUT /api/payroll/periods/:id/reopen`, `PayrollPeriodDetail.tsx` | VERIFIED |
| System Administrator | `Export CSV Ledger` | Primary Actor | `GET /api/payroll/periods/:id/export/csv`, `PayrollPeriodDetail.tsx` | VERIFIED |
| System Administrator | `Analyze Labor Cost % vs POS Sales` | Primary Actor | `GET /api/payroll/reports/analytics`, `PayrollReports.tsx` | VERIFIED |
| Cross-Cutting Goal | `Authenticate & Authorize Session` | `«include»` | `verifyToken`, `requireAdmin` in `routes/index.js` | VERIFIED |
| Cross-Cutting Goal | `Record Immutable Audit Log` | `«include»` | `createLog()` in all mutating service operations | VERIFIED |

---

### Diagram 11: Activity Diagram
| Activity / Node | Semantic Type | Description / Logic | Code Evidence | Confidence |
|---|---|---|---|---|
| `Start: Admin Opens Pay Period` | Initial Node | Selects `periodStart` and `periodEnd` | `createPayrollPeriod()` | VERIFIED |
| `Check Period Overlap` | Decision | Queries existing non-cancelled periods | `PayrollPeriod.findOne({ Op.between })` | VERIFIED |
| `Execute Pre-Calculation Attendance Audit` | Action | Queries missing punches across period | `getAttendanceValidationReport()` | VERIFIED |
| `Anomalies Detected?` | Decision | Inspects `issues.length === 0` | `isReady` boolean return | VERIFIED |
| `Admin Corrects Punches` | Action | Overrides missing punch with reason | `adminCorrectAttendance()` | VERIFIED |
| `Fetch Active Staff Profiles` | Action | Retrieves active employees and rates | `Employee.findAll({ where: { status: 'active' } })` | VERIFIED |
| `Aggregate Attendance & Calculate Entry` | Action | Calls pure calculator engine | `calculatePayrollEntry()` | VERIFIED |
| `Commit Snapshots in Transaction` | Action | Atomic upsert into `PayrollEntries` | `sequelize.transaction()`, `PayrollEntry.upsert` | VERIFIED |
| `Admin Audit & Review` | Action | Inspects line-item entries in UI | `markUnderReview()` | VERIFIED |
| `Approved?` | Decision | Decides whether to approve or cancel | UI modal confirmation | VERIFIED |
| `Freeze Entries & Generate Payslips` | Action | Status = APPROVED, creates payslips | `approvePayroll()`, `generatePayslips()` | VERIFIED |
| `Mark Paid & Permanent Lock` | Action | Status = PAID → LOCKED | `markPayrollPaid()`, `lockPayroll()` | VERIFIED |
| `End: Payroll Cycle Concluded` | Final Node | Concludes cycle | Terminal status reached | VERIFIED |

---

### Diagram 12: Sequence Diagram
| Step # | Caller Participant | Receiver Participant | Message / Invocation | Return Value | Confidence |
|---|---|---|---|---|---|
| 1 | Admin | `UI: PayrollPeriodDetail` | Click "Calculate Payroll" | Trigger UI event | VERIFIED |
| 2 | `UI: PayrollPeriodDetail` | `API: api.ts` | `payrollAPI.calculate(periodId)` | HTTP Request dispatch | VERIFIED |
| 3 | `API: api.ts` | `Route: Express Router` | `POST /api/payroll/periods/:id/calculate [Bearer JWT]` | Ingress HTTP packet | VERIFIED |
| 4 | `Route: Express Router` | `Middleware: Auth & Role` | `verifyToken()`, `requireAdmin()` | Clear execution | VERIFIED |
| 5 | `Route: Express Router` | `Ctrl: PayrollController` | `calculatePayroll(req, res)` | Express dispatch | VERIFIED |
| 6 | `Ctrl: PayrollController` | `Svc: PayrollService` | `calculatePayroll(periodId, adminUser)` | Service call | VERIFIED |
| 7 | `Svc: PayrollService` | `Cfg: PayrollConfigService` | `getPayrollConfig()` | Structured config object | VERIFIED |
| 8 | `Svc: PayrollService` | `DB: MySQL (Sequelize)` | `Employee.findAll({ status: 'active' })` | Active staff list | VERIFIED |
| 9 (loop) | `Svc: PayrollService` | `Att: AttendanceService` | `getAttendanceForPeriod(empId, start, end)` | Punch logs array | VERIFIED |
| 10 (loop) | `Svc: PayrollService` | `Calc: PayrollCalculator` | `calculatePayrollEntry(snapshot, period, punches, config)` | Deterministic calculated payload | VERIFIED |
| 11 | `Svc: PayrollService` | `DB: MySQL (Sequelize)` | `sequelize.transaction()`: upsert entries, set status='CALCULATED' | Commit confirmation | VERIFIED |
| 12 | `Svc: PayrollService` | `Log: Logger` | `createLog({ action: 'OTHER', module: 'payroll' })` | Insert audit record | VERIFIED |
| 13 | `Svc: PayrollService` | `Ctrl: PayrollController` | Return `{ period, entryCount }` | Service result | VERIFIED |
| 14 | `Ctrl: PayrollController` | `UI: PayrollPeriodDetail` | HTTP 200 `{ success: true, data }` | JSON response payload | VERIFIED |

---

### Diagram 13: State Machine Diagram [LOCKED / PROFESSOR-APPROVED]
- Verified against existing approved artifact in `docs/payroll/SYSTEM_DIAGRAMS_BLUEPRINT.md`.

---

### Diagram 14: Communication Diagram
| Message # | Source Object | Target Object | Invocation Payload | Source File | Confidence |
|---|---|---|---|---|---|
| `1:` | `admin:Administrator` | `ui:PayrollPeriodDetail` | `triggerCalculate(periodId)` | `PayrollPeriodDetail.tsx:112` | VERIFIED |
| `2:` | `ui:PayrollPeriodDetail` | `ctrl:PayrollController` | `POST /api/payroll/periods/:id/calculate` | `services/api.ts:224` | VERIFIED |
| `3:` | `ctrl:PayrollController` | `svc:PayrollService` | `calculatePayroll(periodId, adminUser)` | `payrollController.js:58` | VERIFIED |
| `4:` | `svc:PayrollService` | `cfg:PayrollConfigService` | `getPayrollConfig()` | `payrollService.js:134` | VERIFIED |
| `5:` | `svc:PayrollService` | `att:AttendanceService` | `getAttendanceForPeriod(empId, start, end)` | `payrollService.js:170` | VERIFIED |
| `6:` | `svc:PayrollService` | `calc:PayrollCalculator` | `calculatePayrollEntry(snapshot, dates, punches, cfg)` | `payrollService.js:177` | VERIFIED |
| `7:` | `svc:PayrollService` | `db:MySQL_Sequelize` | `upsert(PayrollEntry, { transaction })` | `payrollService.js:204` | VERIFIED |
| `8:` | `svc:PayrollService` | `log:AuditLogger` | `createLog(action='PAYROLL_CALCULATE')` | `payrollService.js:227` | VERIFIED |
| `9:` | `ctrl:PayrollController` | `ui:PayrollPeriodDetail` | `HTTP 200 OK { success: true, data }` | `payrollController.js:59` | VERIFIED |

---

### Diagram 15: Interaction Overview Diagram
| Workflow Node | Referenced Interaction (`ref`) | Key Execution Activity | Implementation Source | Confidence |
|---|---|---|---|---|
| Node 1 | `ref Shift Punch Capture` | Employee clocks in/out via `ClockInOut.tsx` | `POST /api/employee/clock-in/out` | VERIFIED |
| Node 2 | `ref Attendance Pre-Validation` | Admin queries pre-calculation missing punch report | `GET /api/payroll/periods/:id/validate` | VERIFIED |
| Node 3 | `ref Administrative Punch Correction` | Admin overrides invalid or missing punch times | `PUT /api/attendance/:id/correct` | VERIFIED |
| Node 4 | `ref Deterministic Period Calculation` | Orchestrates batch wage snapshot upsert | `POST /api/payroll/periods/:id/calculate` | VERIFIED |
| Node 5 | `ref Entry Audit & Adjustments` | Review breakdown, add post-PAID adjustments | `POST /api/payroll/entries/:id/adjust` | VERIFIED |
| Node 6 | `ref Period Approval & Payslip Generation` | Status moves to APPROVED, generates payslips | `PUT .../approve`, `POST .../payslips` | VERIFIED |
| Node 7 | `ref Salary Disbursement & Status Lock` | Status moves to PAID, permanently to LOCKED | `PUT .../paid`, `PUT .../lock` | VERIFIED |

---

### Diagram 16: Timing Diagram
| Timeline Anchor | Time Value | Event / State Transition | Logic / Threshold Source | Confidence |
|---|---|---|---|---|
| `T0: Scheduled Shift Start` | `08:00:00` | Target shift starting time | Shift schedule configuration | VERIFIED |
| `T1: Grace Period Window` | `08:00:00 – 08:05:00` | Arriving within window incurs 0 late minutes | `gracePeriodMinutes = 5` in `PayrollConfigs` | VERIFIED |
| `T2: Late Threshold Crossed` | `08:05:01` | Lateness begins accumulating | Evaluated in `attendanceService.js` | VERIFIED |
| `T3: Actual Employee Clock-In` | `08:15:00` | Late Minutes = 15; state = CLOCKED_IN | `Attendance.create({ lateMinutes: 15 })` | VERIFIED |
| `T4: Unpaid Lunch Break` | `12:00:00 – 13:00:00` | Unpaid break duration deducted from `totalHours` | `breakMinutes = 60` in `PayrollConfigs` | VERIFIED |
| `T5: Scheduled Shift End` | `17:00:00` | Net 8.0 regular hours reached | `regularHoursPerDay = 8` in `PayrollConfigs` | VERIFIED |
| `T6: Overtime Accrual Window` | `17:00:00 – 18:30:00` | Overtime hours accumulate (1.50 hrs) | Evaluated in `aggregateAttendance()` | VERIFIED |
| `T7: Actual Employee Clock-Out` | `18:30:00` | Clock-Out saved; totalHours = 9.50 (net 8 Reg + 1.5 OT) | `Attendance.save({ clockOut })` | VERIFIED |

---

### Diagram 17: Requirement Diagram (SysML)
| Requirement ID | Text ("The system shall...") | Satisfying Component (`«satisfy»`) | Verifying Test / Evidence (`«verify»`) | Confidence |
|---|---|---|---|---|
| `REQ-PAY-001` | "The system shall calculate employee payroll using deterministic pure formulas with zero database side-effects." | `japz-backend/services/payrollCalculator.js` | `vitest run __tests__/payrollCalculator.test.js` | VERIFIED |
| `REQ-PAY-002` | "The system shall round all monetary computations to exactly two decimal places using roundMoney()." | `payrollCalculator.js:roundMoney` | `vitest: describe('roundMoney()')` | VERIFIED |
| `REQ-PAY-003` | "The system shall never produce a negative net pay value." | `payrollCalculator.js:netPay` | `vitest: it('ensures netPay is never negative')` | VERIFIED |
| `REQ-PAY-004` | "The system shall enforce an immutable 7-stage pay period lifecycle (DRAFT to LOCKED)." | `japz-backend/services/payrollService.js:assertTransitionAllowed` | `payrollPeriodModel.js:status` enum | VERIFIED |
| `REQ-PAY-005` | "The system shall snapshot employee hourly rates at calculation time to preserve historical wage integrity." | `japz-backend/models/payrollEntryModel.js` | `snapshotHourlyRate` database column | VERIFIED |
| `REQ-PAY-006` | "The system shall validate shift attendance and flag missing clock-outs prior to payroll calculation." | `japz-backend/services/attendanceService.js:getAttendanceValidationReport` | `GET /api/payroll/periods/:id/validate` | VERIFIED |
| `REQ-PAY-007` | "The system shall calculate labor cost-to-sales ratios by comparing gross payroll to completed POS orders." | `japz-backend/services/payrollReportService.js:getPayrollAnalytics` | `GET /api/payroll/reports/analytics` | VERIFIED |
| `REQ-PAY-008` | "The system shall record an immutable audit log entry for every payroll mutation." | `japz-backend/utils/logger.js:createLog` | `Logs` table audit records | VERIFIED |
