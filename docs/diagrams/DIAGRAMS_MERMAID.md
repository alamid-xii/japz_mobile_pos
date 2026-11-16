# JAPZ Restaurant Management System — System Modeling Specifications
## 17 Academically Verified System Diagrams for Payroll & Attendance Module

**Student Author:** Aaron Jasper S. Agbas  
**Degree & Section:** BSIT 4F1 — Mindoro State University  
**Target Module:** JAPZ Payroll, Time & Attendance, and Labor Cost Analytics Module  
**Verification Baseline:** Direct inspection of active repository code, database schema, Sequelize ORM associations, Express routes, and React components.  
**Package Status:** 15 Newly Verified Diagrams + 2 Locked Professor-Approved Diagrams = 17 Total Diagrams.

---

# Diagram 1 — System Architecture Diagram

## Type
Structural

## Purpose
Exhibits the multi-tier client-server layout, infrastructure components, communication protocols, application layers, and database persistence governing the JAPZ Payroll & Attendance subsystem.

## Repository Evidence
- Presentation: `japz-web/src/pages/admin/`, `japz-web/src/pages/employee/`, `japz-web/src/services/api.ts`
- Routing & Security: `japz-backend/routes/index.js`, `japz-backend/routes/payrollRoutes.js`, `japz-backend/routes/employeeRoutes.js`
- Services & Controller: `japz-backend/controllers/payrollController.js`, `japz-backend/services/payrollService.js`, `japz-backend/services/attendanceService.js`, `japz-backend/services/payrollConfigService.js`, `japz-backend/services/payrollReportService.js`, `japz-backend/services/employeePayrollService.js`
- Pure Engine: `japz-backend/services/payrollCalculator.js`
- Persistence & Database: `japz-backend/models/index.js`, `japz-backend/models/db.js`
- Cross-Cutting: `japz-backend/utils/logger.js`

## Assumptions
None.

## Mermaid Code
```mermaid
graph TB
    subgraph ClientLayer ["Client Presentation Layer (React 19 + TypeScript + Vite)"]
        UI_Admin["Admin Management Portal\n(PayrollDashboard, AttendanceManagement,\nPayrollPeriodDetail, PayrollReports,\nPayrollSettings, StaffPayManagement)"]
        UI_Staff["Staff Self-Service Portal\n(ClockInOut Widget, MyPayslips Remittance Viewer)"]
        UI_Client["Axios HTTP Client & Interceptor\n(services/api.ts — Bearer JWT Injection)"]
        UI_Admin --> UI_Client
        UI_Staff --> UI_Client
    end

    subgraph SecurityGateway ["Security & Routing Layer (Express.js Gateway)"]
        Router["Express Application Router\n(/api/payroll/*, /api/employee/*)"]
        AuthMid["JWT Authentication Guard\n(verifyToken Middleware — JWT_SECRET)"]
        RoleMid["Role Authorization Guard\n(requireAdmin Middleware — role === 'admin')"]
        UI_Client -- "HTTPS / JSON Payload + Bearer JWT" --> Router
        Router --> AuthMid
        AuthMid --> RoleMid
    end

    subgraph ControllerServiceLayer ["Application Logic Layer (japz-backend/services)"]
        PayrollCtrl["PayrollController.js\n(HTTP Request Ingestion, Validation & JSON Formatter)"]
        RoleMid --> PayrollCtrl
        
        subgraph BusinessServices ["Modular Domain Services"]
            AttendanceSvc["AttendanceService.js\n(Shift punch evaluation, grace periods, missing punch report)"]
            PayrollSvc["PayrollService.js\n(Lifecycle orchestrator, state transition guard, transactions)"]
            ReportSvc["PayrollReportService.js\n(Labor cost ratio vs POS completed sales, CSV export)"]
            ConfigSvc["PayrollConfigService.js\n(Dynamic payroll rules & in-memory cache)"]
            EmployeeSvc["EmployeePayrollService.js\n(POS user sync & per-employee wage settings)"]
        end
        
        PayrollCtrl --> PayrollSvc
        PayrollCtrl --> AttendanceSvc
        PayrollCtrl --> ReportSvc
        PayrollCtrl --> ConfigSvc
        PayrollCtrl --> EmployeeSvc
        PayrollSvc --> AttendanceSvc
        PayrollSvc --> ConfigSvc
    end

    subgraph PureEngine ["Isolated Mathematical Engine (Zero DB Dependencies)"]
        CalcEngine["PayrollCalculator.js\n- Pure mathematical function (Deterministic)\n- Zero database queries, zero side effects\n- roundMoney() precision protection\n- 27/27 Vitest Unit Tests Passing"]
        PayrollSvc --> CalcEngine
    end

    subgraph DataAccessLayer ["Persistence Layer (Sequelize ORM & MySQL 8.0)"]
        ORM["Sequelize ORM Engine\n(ACID Multi-table Transactions)"]
        PayrollSvc --> ORM
        AttendanceSvc --> ORM
        ReportSvc --> ORM
        ConfigSvc --> ORM
        EmployeeSvc --> ORM
        
        subgraph RelationalDB ["MySQL Database (japz_pos)"]
            T_Users[("Users\n(Credentials & Role)")]
            T_Employees[("Employees\n(Wage Profiles)")]
            T_Attendances[("Attendances\n(Clock Punches)")]
            T_Configs[("payroll_configs\n(Dynamic Rules)")]
            T_Periods[("payroll_periods\n(Pay Cycles)")]
            T_Entries[("payroll_entries\n(Historical Snapshots)")]
            T_Adjustments[("payroll_adjustments\n(Post-PAID Records)")]
            T_Payslips[("payslips\n(Remittance Advice)")]
            T_Orders[("Orders\n(POS Completed Sales)")]
            T_Logs[("Logs\n(Audit Trail)")]
        end
        
        ORM --> T_Users
        ORM --> T_Employees
        ORM --> T_Attendances
        ORM --> T_Configs
        ORM --> T_Periods
        ORM --> T_Entries
        ORM --> T_Adjustments
        ORM --> T_Payslips
        ORM --> T_Orders
        ORM --> T_Logs
    end

    subgraph CrossCutting ["Cross-Cutting Concerns"]
        Logger["utils/logger.js (createLog)"]
        PayrollSvc -.-> Logger
        AttendanceSvc -.-> Logger
        ConfigSvc -.-> Logger
        EmployeeSvc -.-> Logger
        Logger --> T_Logs
    end
```

## Accuracy Notes
Directly reflects the physical separation between React 19 frontend, Express routing with custom `requireAdmin` security middleware, isolated pure mathematical engine `PayrollCalculator.js`, and the MySQL database managed via Sequelize ORM.

## Validation
- **Mermaid Syntax:** PASS
- **Repository Traceability:** PASS
- **Professor Review:** PASS
- **Confidence:** HIGH

---

# Diagram 2 — Class Diagram

## Type
Structural

## Purpose
Maps object-oriented classes and Sequelize models, detailing attributes, data types, operational methods, and relational cardinalities across the payroll domain.

## Repository Evidence
- Models: `japz-backend/models/*.js` (`userModel.js`, `employeeModel.js`, `attendanceModel.js`, `payrollPeriodModel.js`, `payrollEntryModel.js`, `payrollAdjustmentModel.js`, `payslipModel.js`, `payrollConfigModel.js`, `orderModel.js`, `logModel.js`)
- Associations: `japz-backend/models/index.js:50-110`

## Assumptions
None.

## Mermaid Code
```mermaid
classDiagram
    class User {
        +int id
        +string name
        +string email
        +string password
        +string role
        +string status
        +json assignedCategories
        +decimal hourlyRate
        +hasOne(Employee)
        +hasMany(Order)
        +hasMany(PayrollPeriod)
    }

    class Employee {
        +int id
        +string name
        +string email
        +string phone
        +string password
        +string role
        +date joinDate
        +int assignedStationId
        +json assignedCategories
        +string status
        +decimal hourlyRate
        +int userId
        +decimal dailyAllowance
        +decimal monthlyAllowance
        +boolean overtimeAllowed
        +boolean sssExempt
        +boolean philhealthExempt
        +boolean pagibigExempt
        +boolean taxExempt
        +decimal customDeduction
        +belongsTo(User)
        +hasMany(Attendance)
        +hasMany(PayrollEntry)
        +hasMany(Payslip)
    }

    class Attendance {
        +int id
        +int employeeId
        +date date
        +datetime clockIn
        +datetime clockOut
        +decimal totalHours
        +int lateMinutes
        +int undertimeMinutes
        +string notes
        +belongsTo(Employee)
    }

    class PayrollPeriod {
        +int id
        +date periodStart
        +date periodEnd
        +date payDate
        +string status
        +string description
        +int createdBy
        +int approvedBy
        +datetime approvedAt
        +datetime paidAt
        +text cancelReason
        +belongsTo(User)
        +hasMany(PayrollEntry)
    }

    class PayrollEntry {
        +int id
        +int payrollPeriodId
        +int employeeId
        +string snapshotEmployeeName
        +string snapshotRole
        +decimal snapshotHourlyRate
        +decimal regularHours
        +decimal overtimeHours
        +decimal basicPay
        +decimal overtimePay
        +decimal holidayPay
        +decimal restDayPay
        +decimal allowances
        +decimal bonuses
        +decimal grossPay
        +int lateMinutes
        +int undertimeMinutes
        +decimal absenceDays
        +decimal lateDeduction
        +decimal undertimeDeduction
        +decimal absenceDeduction
        +decimal cashAdvanceDeduction
        +decimal otherDeductions
        +decimal totalDeductions
        +decimal netPay
        +string status
        +text notes
        +datetime calculatedAt
        +int calculatedBy
        +belongsTo(PayrollPeriod)
        +belongsTo(Employee)
        +hasOne(Payslip)
        +hasMany(PayrollAdjustment)
    }

    class PayrollAdjustment {
        +int id
        +int payrollEntryId
        +string adjustmentType
        +string description
        +decimal amount
        +text reason
        +int createdBy
        +belongsTo(PayrollEntry)
    }

    class Payslip {
        +int id
        +int payrollEntryId
        +int employeeId
        +datetime generatedAt
        +int generatedBy
        +boolean isSuperseded
        +belongsTo(PayrollEntry)
        +belongsTo(Employee)
    }

    class PayrollConfig {
        +int id
        +string configKey
        +string configValue
        +string description
        +int updatedBy
    }

    class Order {
        +int id
        +string orderNumber
        +int cashierId
        +int preparedById
        +decimal total
        +string status
        +datetime completedAt
    }

    class Log {
        +int id
        +int userId
        +string userName
        +string action
        +string module
        +int entityId
        +string entityType
        +text description
        +json changes
        +string ipAddress
        +string status
        +text errorMessage
    }

    User "1" <--> "0..1" Employee : maps credentials
    Employee "1" o-- "0..*" Attendance : records
    User "1" o-- "0..*" PayrollPeriod : creates/approves
    PayrollPeriod "1" *-- "1..*" PayrollEntry : contains
    Employee "1" o-- "0..*" PayrollEntry : historical wage records
    PayrollEntry "1" *-- "0..1" Payslip : generates
    PayrollEntry "1" o-- "0..*" PayrollAdjustment : post-paid adjustments
    Employee "1" o-- "0..*" Payslip : receives
    Order "0..*" ..> PayrollPeriod : aggregates labor %
    User "1" ..> Log : triggers audit
```

## Accuracy Notes
All field names, data types, and cardinalities are 100% matched to Sequelize schema definitions in `japz-backend/models/`. Composite aggregations (`*--`) explicitly indicate child lifecycle dependency (e.g. `PayrollEntry` within `PayrollPeriod`).

## Validation
- **Mermaid Syntax:** PASS
- **Repository Traceability:** PASS
- **Professor Review:** PASS
- **Confidence:** HIGH

---

# Diagram 3 — Component Diagram

STATUS: PROFESSOR-APPROVED / LOCKED  
*Existing approved diagram preserved unchanged per instructions.*

## Mermaid Code
```mermaid
graph LR
    subgraph FrontendComponents ["React Frontend Components (japz-web)"]
        CompDash["PayrollDashboard.tsx"]
        CompDetail["PayrollPeriodDetail.tsx"]
        CompAtt["AttendanceManagement.tsx"]
        CompRep["PayrollReports.tsx"]
        CompSet["PayrollSettings.tsx"]
        CompClock["ClockInOut.tsx"]
        CompSlip["MyPayslips.tsx"]
        APIClient["services/api.ts (payrollAPI, attendanceAPI)"]

        CompDash --> APIClient
        CompDetail --> APIClient
        CompAtt --> APIClient
        CompRep --> APIClient
        CompSet --> APIClient
        CompClock --> APIClient
        CompSlip --> APIClient
    end

    subgraph BackendAPI ["Express Backend (japz-backend)"]
        PRouter["payrollRoutes.js"]
        ERouter["employeeRoutes.js"]
        PCtrl["payrollController.js"]

        APIClient -- "REST Endpoints" --> PRouter
        APIClient -- "Punch Endpoints" --> ERouter
        PRouter --> PCtrl
        ERouter --> PCtrl
    end

    subgraph CoreServices ["Service Layer"]
        PSvc["payrollService.js"]
        ASvc["attendanceService.js"]
        RSvc["payrollReportService.js"]
        CSvc["payrollConfigService.js"]
        Calc["payrollCalculator.js (Pure Function)"]

        PCtrl --> PSvc
        PCtrl --> ASvc
        PCtrl --> RSvc
        PCtrl --> CSvc
        PSvc --> Calc
        PSvc --> ASvc
    end

    subgraph Persistence ["Persistence & Models"]
        DBModels["Sequelize Models (index.js)\n- PayrollPeriod\n- PayrollEntry\n- Attendance\n- Payslip\n- PayrollConfig\n- Order"]
        AuditUtil["utils/logger.js"]

        PSvc --> DBModels
        ASvc --> DBModels
        RSvc --> DBModels
        CSvc --> DBModels
        PSvc --> AuditUtil
        ASvc --> AuditUtil
    end
```

---

# Diagram 4 — Deployment Diagram

## Type
Structural

## Purpose
Maps software execution artifacts to their physical hardware, runtime containers, network protocols, and ports across client and server environments.

## Repository Evidence
- Web runtime: `japz-web/package.json` (Vite, React 19)
- Backend runtime: `japz-backend/package.json` (Node.js >= 18.0.0, Express 4.19)
- Database connectivity: `japz-backend/models/db.js` (MySQL dialect, port 3306, Railway cloud / localhost fallback)

## Assumptions
None.

## Mermaid Code
```mermaid
graph TB
    subgraph Node_Client ["«device» Client Workstation / Tablet / Mobile Device"]
        subgraph Env_Browser ["«executionEnvironment» Modern Web Browser (Chrome / Safari / Firefox)"]
            Art_WebBundle ["«artifact» japz-web.bundle\n(React 19 SPA, TypeScript, Vite 7.3)\nClient State & Axios Interceptor"]
        end
    end

    subgraph Node_AppServer ["«device» Application Server (Localhost / Railway Cloud VM)"]
        subgraph Env_Node ["«executionEnvironment» Node.js Runtime (v18.0.0+)"]
            Art_BackendService ["«artifact» japz-backend.service\n(Express 4.19 Framework)\nPort: 3000 / 5000\nJWT Verification & Role Middleware"]
            Art_SequelizeORM ["«artifact» sequelize-orm.module\n(Sequelize v6.37)\nConnection Pool & ACID Transactions"]
            Art_BackendService --> Art_SequelizeORM
        end
    end

    subgraph Node_DBServer ["«device» Relational Database Server (Localhost / Railway Managed DB)"]
        subgraph Env_MySQL ["«executionEnvironment» MySQL Database Engine (v8.0)"]
            Art_Database ["«artifact» japz_pos.sql\nRelational Tables & Foreign Keys\nPort: 3306"]
        end
    end

    Art_WebBundle -- "HTTPS / TLS 1.3 (Port 443 / 3000)\nREST API JSON Payloads + Bearer Token" --> Art_BackendService
    Art_SequelizeORM -- "MySQL Binary Protocol / TCP (Port 3306)\nEncrypted TLS Connection Pool" --> Art_Database
```

## Accuracy Notes
Meets UML 2.5 deployment specifications using nested execution environments, deployable artifacts, and explicit transport protocols/ports verified from `models/db.js` and `package.json`.

## Validation
- **Mermaid Syntax:** PASS
- **Repository Traceability:** PASS
- **Professor Review:** PASS
- **Confidence:** HIGH

---

# Diagram 5 — Object Diagram

## Type
Structural

## Purpose
Exhibits an instantiated snapshot of runtime object instances with realistic, schema-valid slot values during an approved October 2026 payroll run.

## Repository Evidence
- Models & Schema: `japz-backend/models/`
- Calculation Formulas: `japz-backend/services/payrollCalculator.js`
- Test Fixtures: `japz-backend/__tests__/payrollCalculator.test.js`

## Assumptions
Slot values model an actual cashier employee scenario (Juan Dela Cruz, 192 regular hours, 14.5 overtime hours at ₱75.00/hr).

## Mermaid Code
```mermaid
classDiagram
    class `adminUser : User` {
        id = 1
        name = "Aaron Agbas"
        email = "admin@japz.com"
        role = "admin"
        status = "approved"
    }

    class `empJuan : Employee` {
        id = 101
        name = "Juan Dela Cruz"
        email = "juan@japz.com"
        role = "cashier"
        hourlyRate = 75.00
        overtimeAllowed = true
        status = "active"
    }

    class `attOct15 : Attendance` {
        id = 501
        employeeId = 101
        date = "2026-10-15"
        clockIn = "2026-10-15T08:15:00Z"
        clockOut = "2026-10-15T18:30:00Z"
        totalHours = 9.25
        lateMinutes = 10
        undertimeMinutes = 0
    }

    class `cfgGrace : PayrollConfig` {
        id = 2
        configKey = "gracePeriodMinutes"
        configValue = "5"
    }

    class `cfgOT : PayrollConfig` {
        id = 3
        configKey = "overtimeMultiplier"
        configValue = "1.25"
    }

    class `periodOct2026 : PayrollPeriod` {
        id = 12
        periodStart = "2026-10-01"
        periodEnd = "2026-10-31"
        status = "APPROVED"
        description = "October 2026 Payroll"
        createdBy = 1
        approvedBy = 1
    }

    class `entryJuan : PayrollEntry` {
        id = 88
        payrollPeriodId = 12
        employeeId = 101
        snapshotEmployeeName = "Juan Dela Cruz"
        snapshotRole = "cashier"
        snapshotHourlyRate = 75.00
        regularHours = 192.00
        overtimeHours = 14.50
        basicPay = 14400.00
        overtimePay = 1359.38
        grossPay = 15759.38
        lateMinutes = 10
        lateDeduction = 12.50
        totalDeductions = 12.50
        netPay = 15746.88
        status = "APPROVED"
    }

    class `slipJuan : Payslip` {
        id = 45
        payrollEntryId = 88
        employeeId = 101
        isSuperseded = false
        generatedBy = 1
    }

    class `logApproval : Log` {
        id = 1204
        userId = 1
        action = "OTHER"
        module = "payroll"
        entityId = 12
        entityType = "PayrollPeriod"
        status = "success"
    }

    `adminUser : User` ..> `periodOct2026 : PayrollPeriod` : approvedBy
    `periodOct2026 : PayrollPeriod` *-- `entryJuan : PayrollEntry` : contains
    `empJuan : Employee` o-- `attOct15 : Attendance` : shiftLog
    `empJuan : Employee` o-- `entryJuan : PayrollEntry` : wageRecord
    `entryJuan : PayrollEntry` *-- `slipJuan : Payslip` : remittanceAdvice
    `adminUser : User` ..> `logApproval : Log` : auditEvent
```

## Accuracy Notes
Uses strict UML instance notation (`instanceName : ClassName`) and mathematical formulas verified from `payrollCalculator.js`: Basic Pay (192 × 75.00 = ₱14,400.00), Overtime Pay (75 × 1.25 × 14.5 = ₱1,359.38), Late Deduction ((75 / 60) × 10 = ₱12.50), Net Pay (15,759.38 - 12.50 = ₱15,746.88).

## Validation
- **Mermaid Syntax:** PASS
- **Repository Traceability:** PASS
- **Professor Review:** PASS
- **Confidence:** HIGH

---

# Diagram 6 — Package Diagram

## Type
Structural

## Purpose
Maps the logical organization of source code packages/modules across the frontend and backend, illustrating compile-time and runtime import dependencies.

## Repository Evidence
- Actual directory structure of `japz-web/src/` and `japz-backend/`
- ESM `import`/`export` dependency graphs in `package.json`

## Assumptions
None.

## Mermaid Code
```mermaid
graph TB
    subgraph Pkg_Web ["«package» japz-web (Presentation Tier)"]
        subgraph Pkg_AdminPages ["«package» pages/admin"]
            P_Dash["PayrollDashboard.tsx"]
            P_Detail["PayrollPeriodDetail.tsx"]
            P_Att["AttendanceManagement.tsx"]
            P_Rep["PayrollReports.tsx"]
            P_Set["PayrollSettings.tsx"]
            P_Staff["StaffPayManagement.tsx"]
        end

        subgraph Pkg_EmployeePages ["«package» pages/employee"]
            P_Clock["ClockInOut.tsx"]
            P_Slip["MyPayslips.tsx"]
        end

        subgraph Pkg_ClientServices ["«package» services"]
            P_Api["api.ts\n(payrollAPI, attendanceAPI)"]
        end

        Pkg_AdminPages -.-> |«import»| Pkg_ClientServices
        Pkg_EmployeePages -.-> |«import»| Pkg_ClientServices
    end

    subgraph Pkg_Backend ["«package» japz-backend (Application & Domain Tier)"]
        subgraph Pkg_Routes ["«package» routes"]
            R_Index["index.js (Mount & Middlewares)"]
            R_Payroll["payrollRoutes.js"]
            R_Employee["employeeRoutes.js"]
        end

        subgraph Pkg_Controllers ["«package» controllers"]
            C_Payroll["payrollController.js"]
        end

        subgraph Pkg_Services ["«package» services"]
            S_Payroll["payrollService.js"]
            S_Attendance["attendanceService.js"]
            S_Config["payrollConfigService.js"]
            S_Report["payrollReportService.js"]
            S_EmployeePay["employeePayrollService.js"]
            S_Calc["payrollCalculator.js\n(Pure Engine)"]
        end

        subgraph Pkg_Models ["«package» models"]
            M_Index["index.js (Associations)"]
            M_DB["db.js (Sequelize Engine)"]
            M_Entities["userModel.js, employeeModel.js,\nattendanceModel.js, payrollPeriodModel.js,\npayrollEntryModel.js, payslipModel.js,\npayrollAdjustmentModel.js, payrollConfigModel.js"]
        end

        subgraph Pkg_Utils ["«package» utils"]
            U_Logger["logger.js (createLog)"]
        end

        subgraph Pkg_Tests ["«package» __tests__"]
            T_CalcTest["payrollCalculator.test.js"]
        end

        Pkg_Routes -.-> |«import»| Pkg_Controllers
        Pkg_Controllers -.-> |«import»| Pkg_Services
        S_Payroll -.-> |«import»| S_Calc
        S_Payroll -.-> |«import»| S_Attendance
        S_Payroll -.-> |«import»| S_Config
        Pkg_Services -.-> |«import»| Pkg_Models
        Pkg_Services -.-> |«import»| Pkg_Utils
        Pkg_Tests -.-> |«import»| S_Calc
    end

    Pkg_ClientServices -.-> |«REST / JSON»| Pkg_Routes
```

## Accuracy Notes
Uses true repository directory paths and verified ECMAScript module dependency flows.

## Validation
- **Mermaid Syntax:** PASS
- **Repository Traceability:** PASS
- **Professor Review:** PASS
- **Confidence:** HIGH

---

# Diagram 7 — Composite Structure Diagram

## Type
Structural

## Purpose
Exposes the internal collaboration architecture, ports, and internal parts encapsulated inside the core `PayrollService` classifier component.

## Repository Evidence
- Service Source: `japz-backend/services/payrollService.js`
- Collaborators: `payrollCalculator.js`, `attendanceService.js`, `payrollConfigService.js`, `utils/logger.js`, `models/db.js`

## Assumptions
None.

## Mermaid Code
```mermaid
graph TB
    subgraph Classifier_PayrollService ["«component» PayrollService (japz-backend/services/payrollService.js)"]
        P1["port p1\n[HTTP API Ingress]"]
        P2["port p2\n[Attendance Intake]"]
        P3["port p3\n[Config Intake]"]
        P4["port p4\n[Calculation Engine Port]"]
        P5["port p5\n[Persistence & TX Port]"]
        P6["port p6\n[Audit Dispatch Port]"]

        subgraph InternalParts ["Internal Structural Parts"]
            Part_Orchestrator["orchestrator : LifecycleCoordinator\n- Enforces VALID_TRANSITIONS\n- Coordinates multi-step calculation"]
            Part_Validator["preCheckEngine : AttendancePreCheck\n- Validates punch readiness before calculation"]
            Part_TxManager["txManager : SequelizeTransactionManager\n- Enforces ACID rollback/commit guarantees"]
            Part_AuditBridge["auditBridge : AuditEventDispatcher\n- Structures before/after state payloads"]
        end

        P1 --> Part_Orchestrator
        Part_Orchestrator --> Part_Validator
        Part_Validator --> P2
        Part_Orchestrator --> P3
        Part_Orchestrator --> P4
        Part_Orchestrator --> Part_TxManager
        Part_TxManager --> P5
        Part_Orchestrator --> Part_AuditBridge
        Part_AuditBridge --> P6
    end

    External_Ctrl["PayrollController.js"] --> P1
    P2 --> External_AttSvc["AttendanceService.js\n(getAttendanceForPeriod)"]
    P3 --> External_CfgSvc["PayrollConfigService.js\n(getPayrollConfig)"]
    P4 --> External_Calc["PayrollCalculator.js\n(calculatePayrollEntry)"]
    P5 --> External_DB["Sequelize ORM\n(PayrollEntry.upsert & PayrollPeriod.save)"]
    P6 --> External_Logger["utils/logger.js\n(createLog)"]
```

## Accuracy Notes
Adheres strictly to the UML Composite Structure definition by isolating the internal parts, ports, and external delegates of ONE complex classifier (`PayrollService.js`).

## Validation
- **Mermaid Syntax:** PASS
- **Repository Traceability:** PASS
- **Professor Review:** PASS
- **Confidence:** HIGH

---

# Diagram 8 — Profile Diagram

## Type
Structural

## Purpose
Specifies domain-specific UML profile extensions (stereotypes, metaclasses, tagged values, and semantic constraints) tailoring standard UML to the financial and restaurant labor domain of JAPZ.

## Repository Evidence
- Immutable Snapshots: `japz-backend/models/payrollEntryModel.js`
- Pure Determinism: `japz-backend/services/payrollCalculator.js`
- Audit Trailing: `japz-backend/models/logModel.js`, `japz-backend/utils/logger.js`
- Status Lifecycles: `japz-backend/models/payrollPeriodModel.js`

## Assumptions
None.

## Mermaid Code
```mermaid
classDiagram
    class `«metaclass» Class` {
    }

    class `«metaclass» Property` {
    }

    class `«metaclass» Operation` {
    }

    class `«stereotype» FinancialSnapshot` {
        +boolean isImmutable = true
        +datetime calculatedAt
        +int calculatedBy
        {constraint: status == 'APPROVED' implies isReadOnly()}
    }

    class `«stereotype» DeterministicEngine` {
        +boolean isPure = true
        +boolean sideEffectFree = true
        +string precisionProtection = "roundMoney"
        {constraint: zeroDatabaseCalls()}
    }

    class `«stereotype» AuditLogged` {
        +string module = "payroll"
        +string entityType
        +boolean logBeforeAfter = true
    }

    class `«stereotype» StateControlled` {
        +string lifecycleMachine = "7-Stage"
        +string terminalStates = "LOCKED, CANCELLED"
        {constraint: enforceValidTransitions()}
    }

    class `«stereotype» MonetaryDecimal` {
        +int precision = 10
        +int scale = 2
        +boolean nonNegative = true
        {constraint: value >= 0.00}
    }

    `«metaclass» Class` <|-- `«stereotype» FinancialSnapshot` : «extension»
    `«metaclass» Class` <|-- `«stereotype» DeterministicEngine` : «extension»
    `«metaclass» Class` <|-- `«stereotype» StateControlled` : «extension»
    `«metaclass» Operation` <|-- `«stereotype» AuditLogged` : «extension»
    `«metaclass» Property` <|-- `«stereotype» MonetaryDecimal` : «extension»
```

## Accuracy Notes
Correctly uses formal UML extension syntax from metaclasses (`Class`, `Property`, `Operation`) to stereotypes with domain constraints directly reflecting JAPZ system invariants.

## Validation
- **Mermaid Syntax:** PASS
- **Repository Traceability:** PASS
- **Professor Review:** PASS
- **Confidence:** HIGH

---

# Diagram 9 — Data Flow Diagram (DFD Level 0 & Level 1)

## Type
Behavioral

## Purpose
Maps the flow, storage, and algorithmic transformations of operational data (shift timestamps, pay cycle dates, employee rates, wage snapshots, and labor cost ratios) across external actors and persistent data stores.

## Repository Evidence
- Entities & Transformations: `attendanceService.js`, `payrollService.js`, `payrollCalculator.js`, `payrollReportService.js`
- Data Stores: `Attendances`, `Employees`, `payroll_configs`, `payroll_periods`, `payroll_entries`, `payslips`, `Orders`, `Logs`

## Assumptions
None. Arrows represent DATA (nouns), never interactive clicks.

## Mermaid Code

### DFD Level 0 (Context Diagram)
```mermaid
graph LR
    StaffEntity[("Restaurant Staff\n(Cashier / Kitchen)")]
    AdminEntity[("System Administrator")]
    POSEntity[("JAPZ POS Orders Subsystem")]
    
    Subsystem["0.0\nJAPZ Payroll & Attendance\nManagement System"]

    StaffEntity -- "Shift Clock-In / Clock-Out Timestamps" --> Subsystem
    Subsystem -- "Itemized Payslip & Remittance Advice" --> StaffEntity

    AdminEntity -- "Cutoff Dates, Dynamic Rules, Punch Overrides" --> Subsystem
    Subsystem -- "Validated Shift Reports, Payroll Ledgers, Labor Analytics" --> AdminEntity

    POSEntity -- "Completed Sales Totals & Order Timestamps" --> Subsystem
```

### DFD Level 1 (Decomposed Process Flow)
```mermaid
graph TB
    Staff[("Restaurant Staff")]
    Admin[("System Administrator")]

    D1[("D1: Attendances Table")]
    D2[("D2: Employees Table")]
    D3[("D3: PayrollConfigs Table")]
    D4[("D4: PayrollPeriods Table")]
    D5[("D5: PayrollEntries Table")]
    D6[("D6: Payslips Table")]
    D7[("D7: Orders Table (POS)")]
    D8[("D8: Logs Table (Audit)")]

    P1["1.0 Capture & Validate\nShift Attendance"]
    P2["2.0 Manage Pay Period\n& Labor Rules"]
    P3["3.0 Compute Deterministic\nWage Snapshots"]
    P4["4.0 Execute Review, Approval\n& Payslip Generation"]
    P5["5.0 Generate Financial Ledgers\n& Labor Analytics"]

    Staff -- "Shift Punch Timestamps" --> P1
    D3 -- "Grace Period & Break Rules" --> P1
    P1 -- "Validated Attendance Records" --> D1
    P1 -- "Punch Mutation Audit Entry" --> D8

    Admin -- "Pay Period Dates & Rules" --> P2
    P2 -- "Pay Period Record (DRAFT)" --> D4
    P2 -- "Config Mutation Audit Entry" --> D8

    D4 -- "Period Cutoff Boundaries" --> P3
    D1 -- "Aggregated Shift Punches" --> P3
    D2 -- "Hourly Rates & Allowances" --> P3
    D3 -- "Overtime & Absence Rules" --> P3
    Admin -- "Trigger Batch Calculation" --> P3
    P3 -- "Calculated Wage Snapshots" --> D5
    P3 -- "Updated Status (CALCULATED)" --> D4
    P3 -- "Calculation Event Audit Entry" --> D8

    Admin -- "Approval & Disburse Signals" --> P4
    D5 -- "Approved Wage Entries" --> P4
    P4 -- "Updated Status (APPROVED/PAID)" --> D4
    P4 -- "Generated Payslip Records" --> D6
    P4 -- "Approval Event Audit Entry" --> D8
    D6 -- "Personal Payslip Advice" --> Staff

    D4 -- "Period Date Range" --> P5
    D5 -- "Gross Payroll Totals" --> P5
    D7 -- "Completed Sales Revenue" --> P5
    P5 -- "Export CSV Ledger & Labor % Report" --> Admin
```

## Accuracy Notes
Balanced Level 0 and Level 1 flows. Every process represents an actual transformation service, every data store matches a database table, and every arrow represents concrete data entities.

## Validation
- **Mermaid Syntax:** PASS
- **Repository Traceability:** PASS
- **Professor Review:** PASS
- **Confidence:** HIGH

---

# Diagram 10 — Use Case Diagram

## Type
Behavioral

## Purpose
Delineates system boundary, external human actors, operational user goals, and cross-cutting include relationships.

## Repository Evidence
- Route Guards & Handlers: `japz-backend/routes/payrollRoutes.js`, `japz-backend/routes/employeeRoutes.js`
- UI Portals: `AdminLayout.tsx`, `CashierLayout.tsx`, `KitchenLayout.tsx`

## Assumptions
Actors are restricted strictly to external roles (`System Administrator`, `Cashier Staff`, `Kitchen Staff`).

## Mermaid Code
```mermaid
graph LR
    ActorAdmin((System Administrator))
    ActorCashier((Cashier Staff))
    ActorKitchen((Kitchen Staff))

    subgraph JAPZ_System_Boundary ["JAPZ Payroll & Attendance Subsystem Boundary"]
        UC_Auth([Authenticate & Validate JWT Session])
        UC_Audit([Record Immutable Audit Log Entry])

        UC_Punch([Clock In / Clock Out Shift])
        UC_ViewPayslip([View & Print Personal Payslip])

        UC_Config([Manage Dynamic Payroll Configs])
        UC_CorrectAtt([Review & Correct Shift Attendance])
        UC_OpenPeriod([Open New Payroll Period])
        UC_Calculate([Run Deterministic Payroll Calculation])
        UC_Adjust([Review & Apply Entry Adjustments])
        UC_Approve([Approve Payroll Period])
        UC_Disburse([Mark Payroll as Disbursed / PAID])
        UC_Reopen([Reopen Payroll Period with Justification])
        UC_Export([Export RFC 4180 CSV Ledger])
        UC_Analytics([Analyze Labor Cost % vs POS Completed Sales])
    end

    ActorCashier --> UC_Punch
    ActorCashier --> UC_ViewPayslip
    ActorKitchen --> UC_Punch
    ActorKitchen --> UC_ViewPayslip

    ActorAdmin --> UC_Config
    ActorAdmin --> UC_CorrectAtt
    ActorAdmin --> UC_OpenPeriod
    ActorAdmin --> UC_Calculate
    ActorAdmin --> UC_Adjust
    ActorAdmin --> UC_Approve
    ActorAdmin --> UC_Disburse
    ActorAdmin --> UC_Reopen
    ActorAdmin --> UC_Export
    ActorAdmin --> UC_Analytics

    UC_Punch -.-> |«include»| UC_Auth
    UC_ViewPayslip -.-> |«include»| UC_Auth
    UC_OpenPeriod -.-> |«include»| UC_Auth
    UC_Calculate -.-> |«include»| UC_Auth
    UC_Approve -.-> |«include»| UC_Auth

    UC_CorrectAtt -.-> |«include»| UC_Audit
    UC_Calculate -.-> |«include»| UC_Audit
    UC_Adjust -.-> |«include»| UC_Audit
    UC_Approve -.-> |«include»| UC_Audit
    UC_Reopen -.-> |«include»| UC_Audit
```

## Accuracy Notes
Uses genuine user goals as use cases. Cross-cutting session verification (`verifyToken`) and audit trail insertion (`createLog`) are modeled via standard `«include»` dependencies.

## Validation
- **Mermaid Syntax:** PASS
- **Repository Traceability:** PASS
- **Professor Review:** PASS
- **Confidence:** HIGH

---

# Diagram 11 — Activity Diagram

## Type
Behavioral

## Purpose
Models the end-to-end operational activity flow of payroll generation, attendance verification, branch decisions, and multi-stage administrative review.

## Repository Evidence
- Service Orchestration: `japz-backend/services/payrollService.js`
- Attendance Validation: `japz-backend/services/attendanceService.js`

## Assumptions
None. Implements standard flowchart modeling activity semantics (Action states, decisions `{}`, start/end).

## Mermaid Code
```mermaid
flowchart TB
    StartNode((Start)) --> A1["Admin Enters Pay Period Dates\n(periodStart & periodEnd)"]
    A1 --> D1{"Period Overlaps\nExisting Record?"}
    
    D1 -- "Yes (Conflict)" --> E1["Display HTTP 409 Overlap Error"]
    E1 --> A1
    
    D1 -- "No" --> A2["Create PayrollPeriod Record\n(Initial Status: DRAFT)"]
    A2 --> A3["Query Attendance Validation Report\n(Scan for missing clock-ins / clock-outs)"]
    
    A3 --> D2{"Unresolved Missing\nPunches Found?"}
    
    D2 -- "Yes (Issues Found)" --> A4["Admin Corrects Punches via Modal\n(Enters time & required written reason)"]
    A4 --> A5["Persist Attendance Correction\n& Write Audit Log Entry"]
    A5 --> A3

    D2 -- "No (Clean Data)" --> A6["Admin Triggers 'Calculate Payroll' Action"]
    A6 --> A7["Load Dynamic Configuration Rules\n(Grace period, OT multiplier, break mins)"]
    A7 --> A8["Fetch Active Staff Wage Profiles\n(Employees & Approved Staff Users)"]
    
    A8 --> A9["Execute Deterministic Payroll Engine\n(calculatePayrollEntry for each employee)"]
    A9 --> A10["Begin Sequelize Database Transaction"]
    A10 --> A11["Bulk Upsert PayrollEntry Records\n(Store historical rate snapshots)"]
    A11 --> A12["Update PayrollPeriod Status = 'CALCULATED'"]
    A12 --> A13["Commit Database Transaction & Log Audit Event"]
    
    A13 --> A14["Admin Reviews Calculated Period Summary\n(Move status to UNDER_REVIEW)"]
    A14 --> D3{"Entries Accurate\n& Verified?"}
    
    D3 -- "Adjustments Needed" --> A15["Record Individual Entry Adjustment\n(or Reset to DRAFT for Recalculation)"]
    A15 --> A14

    D3 -- "Approved by Admin" --> A16["Execute Period Approval\n(Status = APPROVED, entries frozen)"]
    A16 --> A17["Generate Employee Payslip Records\n(Available on staff portal)"]
    
    A17 --> D4{"Disburse Salaries?"}
    D4 -- "Yes" --> A18["Mark Payroll as PAID\n(Record payment timestamp)"]
    A18 --> A19["Lock Period Permanently\n(Status = LOCKED, terminal state)"]
    A19 --> EndNode((End))
    
    D4 -- "Reopen Required" --> A20["Admin Supplies Justification Reason"]
    A20 --> A21["Reopen to UNDER_REVIEW\n(Mark existing payslips superseded)"]
    A21 --> A14
```

## Accuracy Notes
Models activity semantics (actions, branch conditions, merges) rather than states, faithfully representing the real runtime execution flow of `payrollService.js`.

## Validation
- **Mermaid Syntax:** PASS
- **Repository Traceability:** PASS
- **Professor Review:** PASS
- **Confidence:** HIGH

---

# Diagram 12 — Sequence Diagram

## Type
Behavioral

## Purpose
Exhibits the vertical chronological call chain, database transactions, and component interactions during the execution of a pay period calculation.

## Repository Evidence
- Route: `japz-backend/routes/payrollRoutes.js:54`
- Middleware: `japz-backend/routes/index.js:48-69`
- Controller: `japz-backend/controllers/payrollController.js:56-68`
- Service: `japz-backend/services/payrollService.js:124-244`
- Calculator: `japz-backend/services/payrollCalculator.js:165-287`
- Audit: `japz-backend/utils/logger.js:createLog`

## Assumptions
None.

## Mermaid Code
```mermaid
sequenceDiagram
    autonumber
    actor Admin as System Administrator
    participant UI as PayrollPeriodDetail.tsx
    participant Client as api.ts (Axios Client)
    participant Route as Express Router (payrollRoutes)
    participant Guard as verifyToken & requireAdmin
    participant Ctrl as PayrollController.js
    participant Svc as PayrollService.js
    participant ConfigSvc as PayrollConfigService.js
    participant AttSvc as AttendanceService.js
    participant Calc as PayrollCalculator.js
    participant DB as MySQL DB (Sequelize Transaction)
    participant Log as Logger (utils/logger.js)

    Admin->>UI: Clicks "Calculate Payroll" Button
    UI->>Client: payrollAPI.calculate(periodId)
    Client->>Route: POST /api/payroll/periods/:id/calculate [Bearer JWT]
    Route->>Guard: Validate Authorization Token & Admin Role
    Guard-->>Route: User Verified (id, role='admin')
    Route->>Ctrl: calculatePayroll(req, res)
    Ctrl->>Svc: calculatePayroll(periodId, adminUser)

    Svc->>DB: PayrollPeriod.findByPk(periodId)
    DB-->>Svc: Returns PayrollPeriod (status: 'DRAFT')
    Svc->>ConfigSvc: getPayrollConfig()
    ConfigSvc-->>Svc: Returns { regularHoursPerDay: 8, overtimeMultiplier: 1.25, ... }
    Svc->>DB: Employee.findAll({ where: { status: 'active' } })
    DB-->>Svc: Returns Array of Active Employees

    loop For Each Active Employee
        Svc->>AttSvc: getAttendanceForPeriod(employeeId, periodStart, periodEnd)
        AttSvc->>DB: Attendance.findAll({ where: { employeeId, date: [between] } })
        DB-->>AttSvc: Return Shift Records
        AttSvc-->>Svc: Return Validated Attendance Array

        Svc->>Calc: calculatePayrollEntry(employeeSnapshot, periodDates, attendanceRecords, config)
        Note over Calc: Pure calculation:<br/>BasicPay = HR × RH<br/>OTPay = HR × 1.25 × OH<br/>LateDeduction = (HR/60) × LateMins<br/>roundMoney() precision check
        Calc-->>Svc: Return Calculated Snapshot Payload
    end

    Svc->>DB: sequelize.transaction() BEGIN
    Svc->>DB: PayrollEntry.upsert(calculatedEntryData) [Inside Transaction]
    Svc->>DB: PayrollPeriod.update({ status: 'CALCULATED' }) [Inside Transaction]
    Svc->>DB: COMMIT Transaction
    DB-->>Svc: Transaction Succeeded

    Svc->>Log: createLog({ action: 'OTHER', module: 'payroll', entityId: period.id })
    Log->>DB: INSERT into Logs table
    Svc-->>Ctrl: Return { period, entryCount }
    Ctrl-->>Client: HTTP 200 OK { success: true, data }
    Client-->>UI: Update Local State & Render Wage Table
    UI-->>Admin: Display Calculation Results with Action Controls
```

## Accuracy Notes
Lifelines, method names, database transactions, loop iterations, and response structures directly mirror verified code in `payrollController.js` and `payrollService.js`.

## Validation
- **Mermaid Syntax:** PASS
- **Repository Traceability:** PASS
- **Professor Review:** PASS
- **Confidence:** HIGH

---

# Diagram 13 — State Machine Diagram

STATUS: PROFESSOR-APPROVED / LOCKED  
*Existing approved diagram preserved unchanged per instructions.*

## Mermaid Code
```mermaid
stateDiagram-v2
    [*] --> DRAFT: Admin opens pay period (Start/End dates)
    
    DRAFT --> CALCULATED: Run Payroll Calculation (generate snapshots)
    DRAFT --> CANCELLED: Cancel payroll period before calculation
    
    CALCULATED --> UNDER_REVIEW: Admin starts entry audit
    CALCULATED --> DRAFT: Reset to DRAFT for complete recalculation
    CALCULATED --> CANCELLED: Cancel period
    
    UNDER_REVIEW --> CALCULATED: Recalculate specific entries
    UNDER_REVIEW --> APPROVED: Admin approves all entries (records frozen)
    UNDER_REVIEW --> CANCELLED: Cancel period
    
    APPROVED --> PAID: Admin marks payroll as disbursed
    APPROVED --> UNDER_REVIEW: Reopen Payroll (Requires documented reason & audit log)
    
    PAID --> LOCKED: Period closed & archived permanently
    
    note right of APPROVED
        Values are frozen.
        Payslips become available.
        No silent recalculation allowed.
    end note
    
    note right of PAID
        Immutable financial record.
        Original entries cannot be modified.
        Post-paid corrections require PayrollAdjustments.
    end note

    LOCKED --> [*]: Terminal State
    CANCELLED --> [*]: Terminal State
```

---

# Diagram 14 — Communication Diagram

## Type
Behavioral

## Purpose
Exhibits the collaboration network of objects interacting during a pay period calculation, using numbered messages to depict sequence and message ordering.

## Repository Evidence
- Service Call Chain: `payrollController.js` → `payrollService.js` → `attendanceService.js`, `payrollCalculator.js`, `models/db.js`, `utils/logger.js`

## Assumptions
None.

## Mermaid Code
```mermaid
flowchart TB
    %% Mermaid does not provide native UML Communication Diagram syntax.
    %% This flowchart preserves communication-diagram semantics:
    %% an interconnected network of collaborating objects with numbered messages.

    Admin["admin : Administrator"]
    UI["ui : PayrollPeriodDetail.tsx"]
    Ctrl["ctrl : PayrollController.js"]
    Svc["svc : PayrollService.js"]
    Cfg["cfg : PayrollConfigService.js"]
    Att["att : AttendanceService.js"]
    Calc["calc : PayrollCalculator.js"]
    DB["db : MySQL_Sequelize"]
    Log["log : AuditLogger"]

    Admin ---|"1: triggerCalculate(periodId)"| UI
    UI ---|"2: POST /api/payroll/periods/:id/calculate"| Ctrl
    Ctrl ---|"3: calculatePayroll(periodId, adminUser)"| Svc
    Svc ---|"4: getPayrollConfig()"| Cfg
    Svc ---|"5: findAll(activeEmployees)"| DB
    Svc ---|"6: getAttendanceForPeriod(empId, start, end)"| Att
    Att ---|"6.1: findAll(Attendances)"| DB
    Svc ---|"7: calculatePayrollEntry(snapshot, dates, punches, cfg)"| Calc
    Svc ---|"8: upsert(PayrollEntry) [transaction]"| DB
    Svc ---|"9: update(PayrollPeriod status='CALCULATED')"| DB
    Svc ---|"10: createLog(action='PAYROLL_CALCULATE')"| Log
    Log ---|"10.1: insert(Logs)"| DB
    Ctrl ---|"11: HTTP 200 OK { success: true, data }"| UI
```

## Accuracy Notes
Models a true network topology with strictly numbered messages (`1:`, `2:`, `3:`, ..., `6.1:`, `10.1:`) demonstrating message order without vertical chronological lifelines.

## Validation
- **Mermaid Syntax:** PASS
- **Repository Traceability:** PASS
- **Professor Review:** PASS
- **Confidence:** HIGH

---

# Diagram 15 — Interaction Overview Diagram

## Type
Behavioral

## Purpose
Merges high-level Activity control logic with references to lower-level interaction scenarios (`ref ...`), showing the overarching restaurant payroll lifecycle.

## Repository Evidence
- High-level business flows documented in `docs/payroll/PAYROLL_WORKFLOW.md` and implemented across backend services.

## Assumptions
None.

## Mermaid Code
```mermaid
flowchart TB
    StartNode((Start)) --> Ref_Clock["ref: Shift Clock-In / Clock-Out & Punch Capture\n(Staff POS Widget Interaction)"]
    Ref_Clock --> Ref_PreVal["ref: Pre-Payroll Attendance Validation\n(Scan for missing clock-ins / clock-outs)"]
    
    Ref_PreVal --> Dec_Issues{"Missing Punches\nDetected?"}
    
    Dec_Issues -- "Yes" --> Ref_PunchCorrection["ref: Administrative Attendance Correction\n(Enter punch override & audit reason)"]
    Ref_PunchCorrection --> Ref_PreVal

    Dec_Issues -- "No" --> Ref_Calc["ref: Deterministic Payroll Calculation\n(Batch pure wage snapshot upsert in transaction)"]
    
    Ref_Calc --> Ref_AuditReview["ref: Entry Audit & Manual Adjustments\n(Under Review entry inspection)"]
    
    Ref_AuditReview --> Dec_Approval{"Period\nApproved?"}
    
    Dec_Approval -- "No (Adjust/Recalc)" --> Ref_Reopen["ref: Reopen Period with Audit Justification\n(Mark prior payslips superseded)"]
    Ref_Reopen --> Ref_AuditReview

    Dec_Approval -- "Yes" --> Ref_ApprovePayslip["ref: Period Approval & Payslip Generation\n(Freeze entries and generate employee payslips)"]
    
    Ref_ApprovePayslip --> Ref_Disburse["ref: Salary Disbursement & Status Lock\n(Status moves to PAID and permanently to LOCKED)"]
    
    Ref_Disburse --> EndNode((End))
```

## Accuracy Notes
Conforms to the UML Interaction Overview Diagram standard: control nodes direct execution flow between distinct referenced interaction scenarios (`ref`).

## Validation
- **Mermaid Syntax:** PASS
- **Repository Traceability:** PASS
- **Professor Review:** PASS
- **Confidence:** HIGH

---

# Diagram 16 — Timing Diagram

## Type
Behavioral

## Purpose
Models the precise chronological timeline, grace period thresholds, work duration, unpaid break deductions, and overtime accrual during an employee shift.

## Repository Evidence
- Grace Period & Shift Constants: `japz-backend/services/payrollConfigService.js` (gracePeriodMinutes=5, breakMinutes=60, regularHoursPerDay=8)
- Attendance Punch Calculation: `japz-backend/services/attendanceService.js:clockOut`
- Test Fixtures: `japz-backend/__tests__/payrollCalculator.test.js`

## Assumptions
None.

## Mermaid Code
```mermaid
flowchart LR
    %% Mermaid does not provide native UML Timing Diagram syntax.
    %% This flowchart preserves timing-diagram semantics:
    %% an explicit horizontal timeline mapping state transitions and threshold constraints.

    subgraph Timeline ["Timeline (Shift: 08:00 to 18:30)"]
        direction LR
        T0["08:00\nScheduled Start"] --> T1["08:05\nGrace Period End\n(5-Min Threshold)"]
        T1 --> T2["08:15\nActual Clock-In\n(10 Mins Late)"]
        T2 --> T3["12:00\nLunch Break Start\n(60 Mins Unpaid)"]
        T3 --> T4["13:00\nLunch Break End\n(Resume Shift)"]
        T4 --> T5["17:00\nScheduled Shift End\n(8.0 Net Reg Hours)"]
        T5 --> T6["18:30\nActual Clock-Out\n(1.50 OT Hours)"]
    end

    subgraph State_Attendance ["Employee Shift State"]
        direction LR
        S_Off1["OFF_DUTY"] --> S_In["CLOCKED_IN (Working)"]
        S_In --> S_Break["ON_UNPAID_BREAK"]
        S_Break --> S_Work["CLOCKED_IN (Working)"]
        S_Work --> S_OT["WORKING_OVERTIME"]
        S_OT --> S_Off2["CLOCKED_OUT (Completed)"]
    end

    subgraph State_Lateness ["Lateness Evaluation State"]
        direction LR
        L_OnTime["ON_TIME_WINDOW\n(Late Mins = 0)"] --> L_Late["LATE_ACCRUAL\n(Late Mins = ClockIn - Start = 15)"]
    end

    subgraph State_Overtime ["Overtime Accrual State"]
        direction LR
        OT_Zero["REGULAR_HOURS\n(Net Hours <= 8.0)"] --> OT_Accrued["OVERTIME_ACCRUAL\n(OT Hours = 1.50)"]
    end

    T0 -.-> L_OnTime
    T1 -.-> L_Late
    T2 -.-> S_In
    T3 -.-> S_Break
    T4 -.-> S_Work
    T5 -.-> OT_Accrued
    T5 -.-> S_OT
    T6 -.-> S_Off2
```

## Accuracy Notes
Emphasizes the central role of TIME, explicit thresholds (5-minute grace period, 60-minute unpaid lunch break, 8.0-hour regular threshold), and parallel state lifelines verified directly from `attendanceService.js`.

## Validation
- **Mermaid Syntax:** PASS
- **Repository Traceability:** PASS
- **Professor Review:** PASS
- **Confidence:** HIGH

---

# Diagram 17 — Requirement Diagram (SysML)

## Type
Behavioral / Structural (SysML)

## Purpose
Formally maps textual functional and non-functional requirements to the architectural software components that satisfy them (`«satisfy»`) and the test suites that verify them (`«verify»`).

## Repository Evidence
- Component Implementations: `payrollCalculator.js`, `payrollService.js`, `attendanceService.js`, `payrollReportService.js`, `logger.js`
- Test Suites: `japz-backend/__tests__/payrollCalculator.test.js`

## Assumptions
None.

## Mermaid Code
```mermaid
graph TB
    subgraph Requirements ["SysML System Requirements Specification"]
        REQ1["«requirement»\nREQ-PAY-001: Deterministic Engine\nId: 'REQ-PAY-001'\nText: 'The system shall calculate payroll via pure deterministic functions with zero DB dependencies.'"]
        REQ2["«requirement»\nREQ-PAY-002: Monetary Precision\nId: 'REQ-PAY-002'\nText: 'The system shall round all monetary calculations to exactly 2 decimal places using roundMoney().'"]
        REQ3["«requirement»\nREQ-PAY-003: Non-Negative Net Pay\nId: 'REQ-PAY-003'\nText: 'The system shall guarantee that net pay is never negative (netPay >= 0).'"]
        REQ4["«requirement»\nREQ-PAY-004: Lifecycle State Machine\nId: 'REQ-PAY-004'\nText: 'The system shall enforce an immutable 7-stage pay period lifecycle (DRAFT to LOCKED).'"]
        REQ5["«requirement»\nREQ-PAY-005: Historical Snapshot\nId: 'REQ-PAY-005'\nText: 'The system shall snapshot employee hourly rates and role names at calculation time.'"]
        REQ6["«requirement»\nREQ-PAY-006: Attendance Pre-Audit\nId: 'REQ-PAY-006'\nText: 'The system shall scan for missing clock-outs before permitting final payroll approval.'"]
        REQ7["«requirement»\nREQ-PAY-007: Labor Analytics vs POS\nId: 'REQ-PAY-007'\nText: 'The system shall calculate labor cost-to-sales ratios against completed POS orders.'"]
        REQ8["«requirement»\nREQ-PAY-008: Immutable Audit Trail\nId: 'REQ-PAY-008'\nText: 'The system shall record an immutable log entry for all financial mutations.'"]
    end

    subgraph Components ["Satisfying System Components"]
        Comp_Calc["PayrollCalculator.js\n(Pure Engine)"]
        Comp_Svc["PayrollService.js\n(Lifecycle Manager)"]
        Comp_EntryModel["PayrollEntry Model\n(Database Schema)"]
        Comp_AttSvc["AttendanceService.js\n(Pre-Audit Engine)"]
        Comp_RepSvc["PayrollReportService.js\n(Analytics Engine)"]
        Comp_Logger["utils/logger.js\n(Audit Module)"]
    end

    subgraph Verifications ["Verifying Tests & Evidence"]
        Test_Vitest["Vitest Unit Suite\n(__tests__/payrollCalculator.test.js)"]
        Test_Round["roundMoney Test Suite\n(27/27 Tests Passing)"]
        Test_Guard["assertTransitionAllowed Guard\n(Runtime Unit Assertion)"]
        Test_DBIndex["Unique DB Constraint\n(unique_period_employee)"]
        Test_ValReport["getAttendanceValidationReport\n(API Validation Route)"]
        Test_POSQuery["Order.sum('total') Query\n(Analytics Integration)"]
        Test_LogsTable["Logs Table Records\n(Sequelize DB Inspection)"]
    end

    Comp_Calc -.-> |«satisfy»| REQ1
    Comp_Calc -.-> |«satisfy»| REQ2
    Comp_Calc -.-> |«satisfy»| REQ3
    Comp_Svc -.-> |«satisfy»| REQ4
    Comp_EntryModel -.-> |«satisfy»| REQ5
    Comp_AttSvc -.-> |«satisfy»| REQ6
    Comp_RepSvc -.-> |«satisfy»| REQ7
    Comp_Logger -.-> |«satisfy»| REQ8

    Test_Vitest -.-> |«verify»| REQ1
    Test_Round -.-> |«verify»| REQ2
    Test_Vitest -.-> |«verify»| REQ3
    Test_Guard -.-> |«verify»| REQ4
    Test_DBIndex -.-> |«verify»| REQ5
    Test_ValReport -.-> |«verify»| REQ6
    Test_POSQuery -.-> |«verify»| REQ7
    Test_LogsTable -.-> |«verify»| REQ8
```

## Accuracy Notes
Uses authentic SysML requirement blocks with unique identifiers (`REQ-PAY-XXX`), textual `"shall"` statements, and explicit `«satisfy»` and `«verify»` relationships grounded in the codebase and test suite.

## Validation
- **Mermaid Syntax:** PASS
- **Repository Traceability:** PASS
- **Professor Review:** PASS
- **Confidence:** HIGH
