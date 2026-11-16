# JAPZ Academic Diagram Rules & Authoritative Standards
## System Architecture & Software Modeling Rubric for JAPZ Payroll & Attendance Module

**Student Author:** Aaron Jasper S. Agbas  
**Academic Section:** BSIT 4F1 — Mindoro State University  
**System Title:** JAPZ Restaurant Management System (Mobile POS Platform)  
**Module Title:** Payroll, Time & Attendance, and Labor Cost Analytics Module  
**Document Purpose:** Master blueprint and semantic specification for generating academically defensible UML/SysML/DFD system diagrams.

---

## 1. Core Academic Principles & Anti-Hallucination Mandates

1. **Implementation-Verified Authority:**
   Every node, attribute, lifeline, message, and relationship must originate from verified code in `japz-backend` or `japz-web`. Generic patterns that do not exist in the repository are strictly forbidden.
2. **Two-Stage Validation Standard:**
   - **Stage 1 (Syntax Validation):** The Mermaid code must compile and render without parser errors.
   - **Stage 2 (Semantic Validation):** The diagram must satisfy formal academic definitions of the UML 2.5 / SysML 1.6 / Gane-Sarson DFD specification. A syntactically valid flowchart disguised as an Activity or Communication diagram is a critical failure.
3. **Locked Status Compliance:**
   - **Diagram 3 (Component Diagram):** LOCKED / PROFESSOR-APPROVED. Must not be altered or redesigned.
   - **Diagram 13 (State Machine Diagram):** LOCKED / PROFESSOR-APPROVED. Must not be altered or redesigned.
4. **Distinction of Diagram Types:**
   Each diagram must answer its unique academic question and use appropriate notation.

---

## 2. Structural Diagram Specifications (Diagrams 1 to 8)

### Diagram 1: System Architecture Diagram
- **Academic Purpose:** Shows high-level layout of servers, clients, infrastructure, application layers, and databases.
- **Authoritative Question:** *"How is the JAPZ system technically structured?"*
- **Required Layers:**
  1. *Client Presentation Layer:* React 19, TypeScript, Vite, TailwindCSS (Admin Management & Staff Self-Service).
  2. *Security & Routing Gateway:* Express.js router, JWT `verifyToken` middleware, role guard `requireAdmin`.
  3. *Application Controller & Service Layer:* `PayrollController`, `PayrollService`, `AttendanceService`, `PayrollConfigService`, `PayrollReportService`, `EmployeePayrollService`.
  4. *Deterministic Calculation Layer:* Isolated pure engine `PayrollCalculator.js` (zero DB dependencies, `roundMoney()` precision protection).
  5. *Persistence Layer:* Sequelize ORM bridging models to MySQL Relational Database.
  6. *Cross-Cutting Infrastructure:* Audit logging engine (`utils/logger.js` → `Logs` table).

---

### Diagram 2: Class Diagram
- **Academic Purpose:** Maps object-oriented classes/data models, attributes, methods, and relationships.
- **Authoritative Question:** *"What important classes/models exist and how are they related?"*
- **Strict Semantic Rules:**
  - Classes must represent verified models (`User`, `Employee`, `Attendance`, `PayrollPeriod`, `PayrollEntry`, `PayrollAdjustment`, `Payslip`, `PayrollConfig`, `Order`, `Log`).
  - Attributes must include actual types (`int`, `string`, `decimal`, `date`, `datetime`, `boolean`).
  - Cardinalities must match verified Sequelize associations:
    - `User "1" <--> "0..1" Employee` (POS user to wage profile link)
    - `Employee "1" o-- "0..*" Attendance` (Attendance records)
    - `PayrollPeriod "1" *-- "1..*" PayrollEntry` (Composite line-item entries)
    - `Employee "1" o-- "0..*" PayrollEntry` (Historical wage records)
    - `PayrollEntry "1" *-- "0..1" Payslip` (1-to-1 payslip advice)
    - `PayrollEntry "1" o-- "0..*" PayrollAdjustment` (Post-PAID adjustments)
    - `User "1" o-- "0..*" PayrollPeriod` (Created/Approved by)
    - `Order "0..*" ..> PayrollPeriod` (Sales reference for labor cost %)
    - `User "1" ..> Log` (Audit trigger)

---

### Diagram 3: Component Diagram [LOCKED / PROFESSOR-APPROVED]
- **Status:** APPROVED BY PROFESSOR. DO NOT REDESIGN OR OVERWRITE.
- **Reference:** Preserved verbatim from `docs/payroll/SYSTEM_DIAGRAMS_BLUEPRINT.md`.

---

### Diagram 4: Deployment Diagram
- **Academic Purpose:** Maps software components to physical hardware, servers, runtimes, containers, or cloud infrastructure where they execute.
- **Authoritative Question:** *"Where is each part of JAPZ actually deployed or executed?"*
- **Strict Semantic Rules:**
  - Must NOT be a copy of the architecture diagram.
  - Must model execution environments (`«device»`, `«executionEnvironment»`), deployable artifacts (`«artifact»`), and communication paths with ports/protocols.
  - Nodes:
    - `Client Workstation / Mobile Device` (`«device»`) running `Web Browser Engine` (`«executionEnvironment»`) hosting `japz-web.bundle` (`«artifact»`).
    - `Application Server (Local Host / Railway VM)` (`«device»`) running `Node.js v18+ Runtime` (`«executionEnvironment»`) hosting `japz-backend.service` (`«artifact»`) on Port 3000 / 5000.
    - `Database Server (Localhost / Railway Cloud)` (`«device»`) running `MySQL 8.0 RDBMS` (`«executionEnvironment»`) hosting `japz_pos.sql` (`«artifact»`) on Port 3306.
  - Communication Paths: `HTTPS / TLS 1.3 (TCP 443 / 3000)`, `MySQL Binary Protocol (TCP 3306)`.

---

### Diagram 5: Object Diagram
- **Academic Purpose:** Shows a snapshot of actual/representative OBJECT INSTANCES of classes at a specific moment in time.
- **Authoritative Question:** *"What could instantiated payroll objects look like during a specific payroll scenario?"*
- **Strict Semantic Rules:**
  - Must use instance notation: `<u>instanceName : ClassName</u>`.
  - Must contain realistic, schema-compatible slot values.
  - Scenario: Approved pay period for October 2026 for Cashier "Juan Dela Cruz" showing calculated basic pay, overtime pay, deductions, net pay, and generated payslip.

---

### Diagram 6: Package Diagram
- **Academic Purpose:** Groups classes/components into higher-level packages/folders and shows dependencies between packages.
- **Authoritative Question:** *"How is the JAPZ source code logically organized?"*
- **Strict Semantic Rules:**
  - Must map real directories: `japz-web` (Presentation), `japz-backend` (Application / Domain), `database` (Persistence).
  - Subpackages: `web/pages/admin`, `web/pages/employee`, `web/services`, `backend/routes`, `backend/controllers`, `backend/services`, `backend/models`, `backend/utils`, `backend/__tests__`.
  - Dependencies must show true import relationships (`-.-> |«import»|`).

---

### Diagram 7: Composite Structure Diagram
- **Academic Purpose:** Shows the internal structure of ONE complex classifier/component.
- **Authoritative Question:** *"What internal parts collaborate inside this selected component?"*
- **Selected Component:** `PayrollService Subsystem` (`japz-backend/services/payrollService.js`).
- **Strict Semantic Rules:**
  - Must focus entirely on `PayrollService` internals.
  - Ports:
    - `p1 [HTTP Request Ingress / Controller Interface]`
    - `p2 [Attendance Intake Port]`
    - `p3 [Dynamic Configuration Port]`
    - `p4 [Deterministic Calculation Port]`
    - `p5 [Persistence & Transaction Port]`
    - `p6 [Audit Dispatch Port]`
  - Internal Parts: `orchestrator: LifecycleCoordinator`, `preCheckEngine: AttendanceValidator`, `calculator: PurePayrollCalculator`, `auditBridge: AuditDispatcher`, `txManager: SequelizeTransactionManager`.

---

### Diagram 8: Profile Diagram
- **Academic Purpose:** Shows UML customization using stereotypes, metaclasses, tagged values, and constraints.
- **Authoritative Question:** *"What domain-specific UML extensions can describe the JAPZ Payroll domain?"*
- **Strict Semantic Rules:**
  - Must extend formal UML Metaclasses (`Class`, `Property`, `Operation`).
  - Stereotypes:
    - `«FinancialSnapshot»` (extends `Class`) with tags `{isImmutable, calculatedAt, calculatedBy}` and constraint `{inv: status = 'APPROVED' implies allAttributes().isReadOnly()}`.
    - `«DeterministicEngine»` (extends `Class`) with tags `{isPure=true, sideEffectFree=true, precisionRule="roundMoney"}`.
    - `«AuditLogged»` (extends `Operation`) with tags `{module="payroll", eventType, logChanges=true}`.
    - `«StateControlled»` (extends `Class`) with tags `{lifecycle="7-Stage", terminalStates="LOCKED, CANCELLED"}`.
    - `«MonetaryDecimal»` (extends `Property`) with tags `{precision=10, scale=2, nonNegative=true}`.

---

## 3. Behavioral Diagram Specifications (Diagrams 9 to 17)

### Diagram 9: Data Flow Diagram (DFD Level 0 & Level 1)
- **Academic Purpose:** Shows how DATA enters the system, is transformed through processes, and is stored.
- **Strict Semantic Rules:**
  - Arrows must represent DATA exclusively (nouns), never UI actions (verbs like "click button").
  - Level 0 (Context): External entities (`Restaurant Staff`, `Restaurant Administrator`, `POS Orders Subsystem`) interacting with `0.0 JAPZ Payroll & Attendance Management System`.
  - Level 1: Numbered transformation processes (`1.0 Capture & Validate Shift Attendance`, `2.0 Configure & Open Pay Period`, `3.0 Compute Deterministic Wage Snapshots`, `4.0 Execute Review, Approval & Payslip Generation`, `5.0 Generate Financial Ledgers & Labor Cost Analytics`), numbered data stores (`D1: Attendances` through `D8: Logs`), and balanced data flows.

---

### Diagram 10: Use Case Diagram
- **Academic Purpose:** Shows relationships between external actors and their user goals.
- **Strict Semantic Rules:**
  - Actors must be external roles: `System Administrator`, `Cashier Employee`, `Kitchen Staff`. Internal tables, services, or controllers are strictly forbidden as actors.
  - Use cases must be user goals (`Clock In / Clock Out Shift`, `View Personal Payslip`, `Open Payroll Period`, `Run Deterministic Payroll Calculation`, `Approve Payroll Period`, etc.).
  - `«include»` applied to cross-cutting functions: `Authenticate & Validate JWT Session` and `Record Immutable Audit Log`.

---

### Diagram 11: Activity Diagram
- **Academic Purpose:** Shows an operational workflow with Start, Activities, Decisions, Branches, Merges, Fork/Join, and End.
- **Strict Semantic Rules:**
  - Must NOT be a State Machine Diagram. Must model activity semantics (action execution) using flowchart nodes and decision diamonds.
  - Workflow: End-to-end payroll processing and audit approval lifecycle (Period creation → Attendance pre-validation → Missing punch resolution → Deterministic computation → Admin audit review → Approval freeze → Payslip generation → Disbursement).

---

### Diagram 12: Sequence Diagram
- **Academic Purpose:** Chronological interactions between system components for ONE specific execution path.
- **Strict Semantic Rules:**
  - Scenario: Administrative Payroll Period Calculation (`POST /api/payroll/periods/:id/calculate`).
  - Lifelines: `Admin (Actor)`, `PayrollPeriodDetail (React UI)`, `api.ts (Axios Client)`, `payrollRoutes (Express Router)`, `payrollController (Controller)`, `payrollService (Service)`, `attendanceService (Service)`, `payrollCalculator (Pure Engine)`, `Sequelize/MySQL (Database)`, `logger (Audit Log)`.
  - Call chain, methods, and return types must match actual implementation.

---

### Diagram 13: State Machine Diagram [LOCKED / PROFESSOR-APPROVED]
- **Status:** APPROVED BY PROFESSOR. DO NOT REDESIGN OR OVERWRITE.
- **Reference:** Preserved verbatim from `docs/payroll/SYSTEM_DIAGRAMS_BLUEPRINT.md`.

---

### Diagram 14: Communication Diagram
- **Academic Purpose:** Shows the network of collaborating objects communicating during a scenario, with numbered messages showing execution order.
- **Strict Semantic Rules:**
  - Same scenario scope as Sequence Diagram (Payroll Calculation execution).
  - Must show an interconnected collaboration network with explicitly numbered messages (`1:`, `1.1:`, `1.2:`, `2:`, `2.1:`, etc.) showing exact interaction sequence.

---

### Diagram 15: Interaction Overview Diagram
- **Academic Purpose:** High-level Activity Diagram control flow where major nodes are interaction references (`ref ...`).
- **Strict Semantic Rules:**
  - Major nodes must reference distinct interaction scenarios:
    - `ref Shift Clock-In/Out & Punch Capture`
    - `ref Attendance Pre-Payroll Validation`
    - `ref Admin Attendance Correction & Audit Logging`
    - `ref Deterministic Calculation & Snapshot Upsert`
    - `ref Entry Audit & Post-Review Adjustments`
    - `ref Period Approval & Payslip Generation`
    - `ref Salary Disbursement & Status Lock`

---

### Diagram 16: Timing Diagram
- **Academic Purpose:** Shows exact timing constraints and state/value changes over an explicit timeline.
- **Strict Semantic Rules:**
  - Must emphasize TIME as the primary horizontal axis.
  - Scenario: Staff Attendance Shift Evaluation against Scheduled Shift, Grace Period, Lunch Break, and Overtime.
  - Time Markers: `08:00 (Shift Start)`, `08:00–08:05 (Grace Period Window)`, `08:06 (Late Threshold)`, `08:15 (Clock-In)`, `12:00–13:00 (Break)`, `17:00 (Shift End)`, `18:30 (Clock-Out)`.
  - State Lifelines: `Shift State`, `Lateness State`, `Overtime State`.

---

### Diagram 17: Requirement Diagram (SysML)
- **Academic Purpose:** Maps textual requirements to components that satisfy them and tests that verify them.
- **Strict Semantic Rules:**
  - Requirements formatted: `REQ-PAY-XXX` with text `"The system shall..."`.
  - Standard SysML relationships:
    - `«satisfy»`: System component satisfies requirement.
    - `«verify»`: Automated test or verification protocol verifies requirement.
    - `«deriveReqt»`: Subordinate requirement derived from higher-level business rule.
