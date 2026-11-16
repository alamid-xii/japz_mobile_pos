# JAPZ Payroll & Attendance Management System
## System Modeling & Architectural Blueprint Document

Based on the blueprinting framework defined in `diagrams.docx`, this document details the system identification, structural blueprinting, behavioral blueprinting, data flow blueprinting, and complete visual diagram models for the **JAPZ Payroll & Attendance Management System** (Subsystem of the JAPZ Mobile POS & Restaurant Management Platform).

---

## Part 1: Project Identification & Blueprinting Worksheet

### 1. Project Identification
- **Project / Proposal Title:**
  **JAPZ: Automated Payroll, Time & Attendance, and Labor Cost Analytics Module for Restaurant Management System**
- **System Summary (2–3 Sentences):**
  The JAPZ Payroll & Attendance Management System is a specialized operational module integrated into the JAPZ Mobile POS platform that automates staff time tracking, shift verification, and deterministic payroll generation for restaurant personnel (cashiers, kitchen staff, and managers). It enforces strict labor rules (dynamic grace periods, late/undertime deductions, and overtime calculations), snapshots historical wage data across an immutable 7-stage approval lifecycle (`DRAFT` → `PAID`), and provides real-time labor cost-to-sales ratios against completed POS transactions to optimize restaurant operating margins.

---

### 2. Structural Blueprinting

- **Selected Structural Diagram:**
  **System Architecture Diagram** *(supplemented by a detailed **Class / Entity-Relationship Diagram** and **Component Diagram**)*
- **Infrastructure & Layout Justification:**
  A **System Architecture Diagram** is critical because the payroll module operates across a multi-tier client-server environment where financial data integrity, role-based authorization, and calculation determinism are paramount:
  1. **Tier Separation:** It defines how the lightweight browser client (React 19, TypeScript, Vite) interacts with the Node.js/Express.js backend via authenticated JWT Bearer HTTP requests.
  2. **Layered Isolation (Separation of Concerns):** It explicitly documents the boundary between mutable API controllers/services and the isolated, pure-function `PayrollCalculator.js` engine (which has zero database dependencies to guarantee determinism).
  3. **Database & Storage Layer:** It maps how Sequelize ORM bridges business models (`PayrollPeriod`, `PayrollEntry`, `Attendance`, `PayrollConfig`, `Payslip`, `Logs`) to the underlying MySQL database with atomic ACID transactions and audit log tracking.

---

### 3. Behavioral Blueprinting

- **Selected Behavioral Diagram 1:**
  **Use Case Diagram**
  - **Project Scenario Mapped:**
    Maps out the core actors (**System Administrator**, **Cashier Employee**, and **Kitchen Staff**) and their interactions with the system. Cashiers and Kitchen staff interact with the **Clock-In/Clock-Out widget** and view personal payslips, while the System Administrator conducts **Attendance Verification & Correction**, sets **Dynamic Payroll Configurations** (grace periods, OT multipliers), initiates **Deterministic Payroll Period Calculation**, executes **Multi-State Approvals & Reopen Workflows**, and exports **Financial CSV / Labor Cost Analytics**.

- **Selected Behavioral Diagram 2:**
  **Sequence Diagram**
  - **Project Scenario Mapped:**
    Maps out the chronological execution and transactional API handshake of the **Payroll Period Calculation & Approval Lifecycle**:
    1. Admin triggers `POST /api/payroll/periods/:id/calculate`.
    2. `PayrollController` invokes `PayrollService.calculatePayroll()`.
    3. `PayrollService` retrieves eligible employees and validated attendance logs from `AttendanceService`.
    4. `PayrollService` feeds employee snapshots into the pure `PayrollCalculator` function.
    5. Calculated entries are saved inside a database transaction (`PayrollEntry` snapshot records).
    6. System records the audit trail via `createLog()` in the `Logs` table.
    7. Standardized JSON response returns to the UI to update the period state machine to `CALCULATED`.

*(Additional behavioral models provided: **State Machine Diagram** for the 7-status lifecycle and **Activity Diagram** for attendance shift validation).*

---

### 4. Data Blueprinting (Data Flow)

- **How Data Flows From User Input to System Database:**
  1. **Input Capture:** A restaurant worker clicks "Clock In" or "Clock Out" on their POS interface (`ClockInOut.tsx`), or an Administrator enters payroll parameters / triggers period calculation on `PayrollPeriodDetail.tsx`.
  2. **Client Validation & Transport:** The React frontend captures the payload, attaches the JWT Bearer authorization token, and transmits an HTTP POST/PUT request through Axios (`services/api.ts`).
  3. **Middleware & Route Ingestion:** Express receives the request at `/api/payroll/*` or `/api/attendance/*`. `verifyToken` validates the JWT signature, and `requireAdmin` validates operational clearance (for administrative payroll functions).
  4. **Service & Pure Calculation Processing:**
     - For attendance: `attendanceService.js` evaluates the current timestamp against the shift schedule and grace period, computes elapsed hours/minutes, and flags missing punches.
     - For payroll: `payrollService.js` orchestrates the period, fetches validated punches, and invokes `payrollCalculator.js`, which applies standard mathematical rounding (`roundMoney()`) to compute basic pay, overtime pay, late/absence deductions, and net pay.
  5. **Data Persistence & Audit Logging:** Sequelize ORM initiates a transactional write (`sequelize.transaction()`) ensuring atomicity. It creates immutable snapshot entries in `PayrollEntries`, updates `PayrollPeriods`, and creates an immutable audit trail in `Logs` using `createLog()`. The database acknowledges the commit, and a structured `{ success: true, data }` response is returned to update the client state.

---

## Part 2: Visual Diagrams (Mermaid Specifications)

### Diagram 1: System Architecture Diagram (Structural)

```mermaid
graph TB
    subgraph ClientLayer ["Client Layer (Frontend - React 19 + TypeScript + Vite)"]
        UI_Admin["Admin Management UI\n(PayrollDashboard, AttendanceManagement,\nPeriodDetail, Reports, Settings)"]
        UI_Staff["Staff Self-Service UI\n(ClockInOut Widget, MyPayslips Modal)"]
        UI_Client["Axios HTTP Client / Token Interceptor\n(services/api.ts)"]
        UI_Admin --> UI_Client
        UI_Staff --> UI_Client
    end

    subgraph SecurityGateway ["Security & Routing Layer (japz-backend)"]
        Router["Express Router (/api/payroll/*, /api/attendance/*)"]
        AuthMid["JWT Auth Middleware (verifyToken)"]
        RoleMid["Role Guard Middleware (requireAdmin)"]
        UI_Client -- "HTTPS / JSON + Bearer JWT" --> Router
        Router --> AuthMid
        AuthMid --> RoleMid
    end

    subgraph ControllerServiceLayer ["Application Logic Layer"]
        PayrollCtrl["PayrollController.js\n(Request Validation & JSON Response)"]
        RoleMid --> PayrollCtrl
        
        subgraph Services ["Modular Business Services"]
            AttendanceSvc["AttendanceService.js\n(Punch validation, missing punch check)"]
            PayrollSvc["PayrollService.js\n(Period orchestrator, transaction lifecycle)"]
            ReportSvc["PayrollReportService.js\n(Labor cost ratio vs POS sales, CSV export)"]
            ConfigSvc["PayrollConfigService.js\n(Dynamic grace period & OT multiplier)"]
        end
        
        PayrollCtrl --> PayrollSvc
        PayrollCtrl --> AttendanceSvc
        PayrollCtrl --> ReportSvc
        PayrollCtrl --> ConfigSvc
    end

    subgraph PureEngine ["Isolated Pure Engine (Determinism)"]
        CalcEngine["PayrollCalculator.js\n- Pure mathematical function\n- Zero DB calls, zero side-effects\n- roundMoney() precision protection\n- 30/30 Unit tests passed"]
        PayrollSvc --> CalcEngine
    end

    subgraph DataAccessLayer ["Persistence Layer (Sequelize ORM & MySQL)"]
        ORM["Sequelize ORM Engine (ACID Transactions)"]
        PayrollSvc --> ORM
        AttendanceSvc --> ORM
        ReportSvc --> ORM
        
        subgraph DB ["MySQL Relational Database"]
            T_Users[("Users")]
            T_Employees[("Employees")]
            T_Attendances[("Attendances")]
            T_Configs[("PayrollConfigs")]
            T_Periods[("PayrollPeriods")]
            T_Entries[("PayrollEntries\n(Historical Snapshot)")]
            T_Adjustments[("PayrollAdjustments")]
            T_Payslips[("Payslips")]
            T_Orders[("Orders (POS Sales)")]
            T_Logs[("Logs (Audit Trail)")]
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

    subgraph CrossCutting ["Audit & Logging"]
        Logger["utils/logger.js (createLog)"]
        PayrollSvc -.-> Logger
        AttendanceSvc -.-> Logger
        Logger --> T_Logs
    end
```

---

### Diagram 2: Class & Entity-Relationship Diagram (Structural)

```mermaid
classDiagram
    class User {
        +int id
        +string name
        +string email
        +string password
        +string role
        +string status
        +hasMany(Order)
        +hasMany(PayrollPeriod)
    }

    class Employee {
        +int id
        +int userId
        +string name
        +string email
        +string phone
        +string role
        +decimal hourlyRate
        +string status
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
        +string status
    }

    class PayrollConfig {
        +int id
        +string configKey
        +string configValue
        +string description
        +int updatedBy
    }

    class PayrollPeriod {
        +int id
        +date periodStart
        +date periodEnd
        +string status
        +string description
        +int createdBy
        +int approvedBy
        +datetime approvedAt
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
        +decimal grossPay
        +int lateMinutes
        +decimal lateDeduction
        +decimal absenceDeduction
        +decimal totalDeductions
        +decimal netPay
        +string status
        +hasOne(Payslip)
        +hasMany(PayrollAdjustment)
    }

    class Payslip {
        +int id
        +int payrollEntryId
        +int employeeId
        +datetime generatedAt
        +int generatedBy
        +boolean isSuperseded
    }

    class PayrollAdjustment {
        +int id
        +int payrollEntryId
        +string adjustmentType
        +decimal amount
        +string reason
        +int createdBy
    }

    class Order {
        +int id
        +string orderNumber
        +int cashierId
        +decimal total
        +string status
        +datetime completedAt
    }

    class Log {
        +int id
        +int userId
        +string action
        +string module
        +int entityId
        +json changes
        +string ipAddress
    }

    User "1" <--> "0..1" Employee : maps credentials
    Employee "1" o-- "0..*" Attendance : records
    User "1" o-- "0..*" PayrollPeriod : creates/approves
    PayrollPeriod "1" *-- "1..*" PayrollEntry : contains
    Employee "1" o-- "0..*" PayrollEntry : wage records
    PayrollEntry "1" *-- "1" Payslip : generates
    PayrollEntry "1" o-- "0..*" PayrollAdjustment : post-paid adjustments
    Order "0..*" ..> PayrollPeriod : aggregates labor %
    User "1" ..> Log : triggers audit
```

---

### Diagram 3: Component Diagram (Structural)

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

### Diagram 4: Use Case Diagram (Behavioral)

```mermaid
graph LR
    ActorAdmin((System Administrator))
    ActorStaff((Restaurant Staff\nCashier / Kitchen))
    ActorTimer((Automated System / Timer))

    subgraph JAPZ_Payroll_System ["JAPZ Payroll & Attendance Subsystem"]
        UC1([Authenticate & Validate JWT Role])
        UC2([Clock In / Clock Out Shift])
        UC3([View Personal Shifts & Punches])
        UC4([View & Print Personal Payslip])
        
        UC5([Manage Dynamic Payroll Configs])
        UC6([Review & Correct Attendance Punches])
        UC7([Open New Payroll Period])
        UC8([Run Deterministic Payroll Calculation])
        UC9([Review & Adjust Payroll Entries])
        UC10([Approve Payroll Period])
        UC11([Disburse & Mark as PAID])
        UC12([Reopen Period to Under Review])
        UC13([Export CSV Payroll Ledger])
        UC14([Analyze Labor Cost % vs POS Sales])
        UC15([Log Audit Trail Events])
    end

    ActorStaff --> UC1
    ActorStaff --> UC2
    ActorStaff --> UC3
    ActorStaff --> UC4

    ActorAdmin --> UC1
    ActorAdmin --> UC5
    ActorAdmin --> UC6
    ActorAdmin --> UC7
    ActorAdmin --> UC8
    ActorAdmin --> UC9
    ActorAdmin --> UC10
    ActorAdmin --> UC11
    ActorAdmin --> UC12
    ActorAdmin --> UC13
    ActorAdmin --> UC14

    UC8 -.-> |<<include>>| UC15
    UC10 -.-> |<<include>>| UC15
    UC11 -.-> |<<include>>| UC15
    UC12 -.-> |<<include>>| UC15
    UC6 -.-> |<<include>>| UC15
```

---

### Diagram 5: Sequence Diagram (Behavioral — Calculation & Lifecycle Execution)

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Restaurant Administrator
    participant UI as React UI (PayrollPeriodDetail)
    participant Route as Express Router (payrollRoutes.js)
    participant Ctrl as PayrollController.js
    participant PSvc as PayrollService.js
    participant ASvc as AttendanceService.js
    participant Calc as PayrollCalculator.js
    participant DB as MySQL DB (Sequelize Transaction)
    participant Log as Logger (utils/logger.js)

    Admin->>UI: Clicks "Calculate Payroll"
    UI->>Route: POST /api/payroll/periods/:id/calculate [Bearer Token]
    Route->>Ctrl: verifyToken & requireAdmin -> calculatePeriod(req, res)
    Ctrl->>PSvc: calculatePayroll(periodId, adminUserId)

    PSvc->>DB: Find PayrollPeriod by PK
    DB-->>PSvc: Return Period (Status: DRAFT or CALCULATED)
    PSvc->>DB: Fetch Active Employees & Hourly Rates
    DB-->>PSvc: Return Employees List

    loop For Each Eligible Employee
        PSvc->>ASvc: getValidatedAttendance(empId, periodStart, periodEnd)
        ASvc->>DB: Query Attendances where date in range
        DB-->>ASvc: Return punch records
        ASvc-->>PSvc: Return validated attendance summary

        PSvc->>Calc: calculatePayrollEntry(empSnapshot, periodDates, attendanceList, rules)
        Note over Calc: Pure calculation: roundMoney(), OT multiplier, late/undertime formulas
        Calc-->>PSvc: Return deterministic calculated payload
    end

    PSvc->>DB: BEGIN TRANSACTION
    PSvc->>DB: Bulk Upsert PayrollEntry records (with rate snapshot)
    PSvc->>DB: Update PayrollPeriod (status = 'CALCULATED')
    PSvc->>DB: COMMIT TRANSACTION
    DB-->>PSvc: Success

    PSvc->>Log: createLog({ action: 'PAYROLL_CALCULATE', periodId, adminUserId })
    Log->>DB: Insert into Logs table
    PSvc-->>Ctrl: { period, entriesCount, summary }
    Ctrl-->>UI: 200 OK { success: true, data: result }
    UI-->>Admin: Updates Dashboard with calculated breakdown & active review tools
```

---

### Diagram 6: Activity Diagram (Behavioral — Shift Clock Punch & Attendance Verification)

```mermaid
stateDiagram-v2
    [*] --> EmployeePunchesClockIn: Employee taps Clock In
    EmployeePunchesClockIn --> FetchActiveShiftRules: Read dynamic grace period from PayrollConfigs
    
    state "Evaluate Clock-In Timing" as EvalIn {
        [*] --> CheckScheduledStart
        CheckScheduledStart --> OnTime: Clock-In <= Shift Start + Grace Period
        CheckScheduledStart --> LateArrival: Clock-In > Shift Start + Grace Period
        LateArrival --> CalculateLateMinutes: Late Mins = Clock-In - Shift Start
    }
    
    EvalIn --> CreateActiveAttendanceRecord: Insert attendance record (clockIn timestamp)
    CreateActiveAttendanceRecord --> ShiftInProgress: Employee works shift
    
    ShiftInProgress --> EmployeePunchesClockOut: Employee taps Clock Out
    
    state "Evaluate Clock-Out Timing" as EvalOut {
        [*] --> CheckScheduledEnd
        CheckScheduledEnd --> Undertime: Clock-Out < Shift End
        CheckScheduledEnd --> StandardShift: Clock-Out == Shift End
        CheckScheduledEnd --> Overtime: Clock-Out > Shift End
        Undertime --> CalculateUndertimeMins
        Overtime --> CalculateOvertimeHours: OT Hours = (Clock-Out - Shift End)
    }
    
    EvalOut --> ComputeTotalHours: Calculate total shift duration in decimal hours
    ComputeTotalHours --> SaveCompletedAttendance: Update attendance (clockOut, totalHours)
    
    state "Admin Attendance Review" as AdminReview {
        SaveCompletedAttendance --> CheckMissingPunches
        CheckMissingPunches --> PunchMissing: Missing In or Out punch
        CheckMissingPunches --> PunchComplete: Normal punch
        PunchMissing --> AdminCorrectsPunch: Admin provides corrected punch & reason
        AdminCorrectsPunch --> LogCorrection: Write to audit Logs table
    }
    
    PunchComplete --> ReadyForPayrollRun: Attendance ready for cutoff
    LogCorrection --> ReadyForPayrollRun
    ReadyForPayrollRun --> [*]
```

---

### Diagram 7: State Machine Diagram (Behavioral — Payroll Period Lifecycle)

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

### Diagram 8: Data Flow Diagram (DFD Level 0 & Level 1)

#### DFD Level 0 (Context Diagram)
```mermaid
graph LR
    StaffUser[("Restaurant Staff\n(Cashier / Kitchen)")]
    AdminUser[("System Administrator")]
    POSOrders[("JAPZ POS Orders Subsystem")]
    
    System["0.0\nJAPZ Payroll & Attendance\nManagement System"]

    StaffUser -- "Clock-In / Clock-Out Punches" --> System
    System -- "Payslips & Shift Records" --> StaffUser

    AdminUser -- "Period Rules, Punch Edits, Approval Actions" --> System
    System -- "Payroll Ledgers, Audit Reports, Labor Analytics" --> AdminUser

    POSOrders -- "Completed Order Sales & Revenue Data" --> System
```

#### DFD Level 1 (Decomposed Process Flow)
```mermaid
graph TB
    Staff[("Staff")]
    Admin[("Admin")]
    
    D1[("D1: Attendances")]
    D2[("D2: Employees")]
    D3[("D3: PayrollConfigs")]
    D4[("D4: PayrollPeriods")]
    D5[("D5: PayrollEntries")]
    D6[("D6: Payslips")]
    D7[("D7: Orders (POS)")]
    D8[("D8: Logs (Audit)")]

    P1["1.0 Record & Validate\nAttendance Punch"]
    P2["2.0 Configure & Open\nPayroll Period"]
    P3["3.0 Deterministic Engine\nCalculation"]
    P4["4.0 Approval Lifecycle\n& Payslip Generation"]
    P5["5.0 Labor Cost vs Sales\nAnalytics & Export"]

    Staff -- "Punch In/Out" --> P1
    D3 -- "Grace Period / Rules" --> P1
    P1 -- "Store punch" --> D1
    P1 -- "Log anomaly/edit" --> D8

    Admin -- "Date Ranges & Status" --> P2
    P2 -- "Open Period (DRAFT)" --> D4
    P2 -- "Log event" --> D8

    D4 -- "Period Dates" --> P3
    D1 -- "Verified Punches" --> P3
    D2 -- "Employee Rates" --> P3
    D3 -- "OT Multiplier / Rules" --> P3
    Admin -- "Trigger Calculate" --> P3
    P3 -- "Store Snapshots" --> D5
    P3 -- "Update Period Status" --> D4
    P3 -- "Audit Log" --> D8

    Admin -- "Approve / Mark Paid" --> P4
    D5 -- "Calculated Entries" --> P4
    P4 -- "Update Status" --> D4
    P4 -- "Generate Payslip" --> D6
    P4 -- "Audit Log" --> D8

    D4 -- "Period Metrics" --> P5
    D5 -- "Gross Pay Totals" --> P5
    D7 -- "Completed Sales" --> P5
    P5 -- "CSV Export & Labor % Report" --> Admin
```
