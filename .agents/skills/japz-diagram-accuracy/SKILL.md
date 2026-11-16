---
name: japz-diagram-accuracy
description: Authoritative academic diagramming and system modeling skill for the JAPZ Restaurant Management System (Payroll & Attendance Module). Use when generating, reviewing, or validating system diagrams (UML, SysML, DFD) or exporting diagram evidence to DOCX.
---

# JAPZ System Diagram Accuracy Skill

## Context & Author
- **Student Author:** Aaron Jasper S. Agbas
- **Degree & Section:** BSIT 4F1 — Mindoro State University
- **System:** JAPZ Restaurant Management System (Mobile POS Platform)
- **Module:** Individual Module — Payroll, Time & Attendance, and Labor Cost Analytics

## Mission
Provide implementation-verified system diagram code, evidence mappings, and semantic validation for downstream AI systems generating academic documentation and DOCX diagram artifacts.

## Ground Truth Rules
1. **Never guess, invent, or generalize:** All classes, methods, ports, routes, models, and lifelines must exist in `japz-backend` or `japz-web`.
2. **Locked Diagram Invariants:**
   - **Diagram 3 (Component Diagram):** LOCKED / PROFESSOR-APPROVED. Do NOT alter.
   - **Diagram 13 (State Machine Diagram):** LOCKED / PROFESSOR-APPROVED. Do NOT alter.
3. **Diagram Distinction Mandate:**
   - Architecture != Deployment (Deployment requires hardware/runtimes/ports/protocols).
   - Activity != State Machine (Activity requires operational actions, decisions, forks, joins).
   - Sequence != Communication (Communication requires collaboration network with numbered messages).
   - Activity != Interaction Overview (Interaction Overview requires `ref` interaction nodes).
   - Sequence != Timing (Timing requires explicit horizontal time axis and state lifelines).

## Diagram Inventory (17 Types Total)
1. **System Architecture Diagram** (`graph TB`, Multi-tier layout, ports, security guards)
2. **Class Diagram** (`classDiagram`, Sequelize models, associations, cardinalities)
3. **Component Diagram** [LOCKED / PROFESSOR-APPROVED]
4. **Deployment Diagram** (`graph TB`, `«device»`, `«executionEnvironment»`, `«artifact»`, ports/protocols)
5. **Object Diagram** (`classDiagram`, `<u>instance : Class</u>` with verified slot values)
6. **Package Diagram** (`graph TB`, actual repository folders and ESM dependencies)
7. **Composite Structure Diagram** (`graph TB`, internal structure of `PayrollService.js`)
8. **Profile Diagram** (`classDiagram`, `«metaclass»` extensions with tagged values & constraints)
9. **Data Flow Diagram (DFD)** (Level 0 Context & Level 1 Decomposed, strictly data flows)
10. **Use Case Diagram** (`graph LR`, human actors, user goals, `«include»` session/audit links)
11. **Activity Diagram** (`flowchart TB`, operational flow with decisions, branches, joins)
12. **Sequence Diagram** (`sequenceDiagram`, chronological API call chain and DB transaction)
13. **State Machine Diagram** [LOCKED / PROFESSOR-APPROVED]
14. **Communication Diagram** (`flowchart TB`, collaboration network with numbered messages)
15. **Interaction Overview Diagram** (`flowchart TB`, control flow linking `ref` interaction nodes)
16. **Timing Diagram** (`flowchart LR`, horizontal timeline, grace period, overtime thresholds)
17. **Requirement Diagram (SysML)** (`graph TB`, `REQ-PAY-XXX`, `«satisfy»`, `«verify»` via Vitest)

## Documentation References
- **Evidence Map:** [SYSTEM_EVIDENCE.md](file:///c:/laragon/www/japz_mobile_pos/docs/diagrams/SYSTEM_EVIDENCE.md)
- **Authoritative Rules:** [DIAGRAM_RULES.md](file:///c:/laragon/www/japz_mobile_pos/docs/diagrams/DIAGRAM_RULES.md)
- **Traceability Matrix:** [DIAGRAM_TRACEABILITY.md](file:///c:/laragon/www/japz_mobile_pos/docs/diagrams/DIAGRAM_TRACEABILITY.md)
- **Master Mermaid Source:** [DIAGRAMS_MERMAID.md](file:///c:/laragon/www/japz_mobile_pos/docs/diagrams/DIAGRAMS_MERMAID.md)
