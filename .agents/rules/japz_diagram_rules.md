# JAPZ Diagram Accuracy Rules

When generating, validating, or modifying software architecture diagrams for JAPZ Restaurant Management System (Payroll & Attendance Module for Aaron Jasper S. Agbas, BSIT 4F1):

1. **Strict Implementation-First Principle:**
   - Every diagram element must be verified against actual code in `japz-backend` and `japz-web`.
   - Never generate textbook or generic payroll diagrams.

2. **Locked Diagram Invariants:**
   - **Diagram 3 (Component Diagram):** LOCKED / PROFESSOR-APPROVED. Never overwrite or redesign.
   - **Diagram 13 (State Machine Diagram):** LOCKED / PROFESSOR-APPROVED. Never overwrite or redesign.

3. **Semantic Correctness:**
   - Always differentiate between Diagram Types according to [DIAGRAM_RULES.md](file:///c:/laragon/www/japz_mobile_pos/docs/diagrams/DIAGRAM_RULES.md).
   - In DFDs, arrows MUST represent data (nouns), never UI actions.
   - In Use Cases, actors MUST be human external roles, never database tables or backend controllers.
   - In Sequence Diagrams, use real implementation functions and routes.
   - In Timing Diagrams, time MUST be the central axis.

4. **Reference Documentation:**
   - Evidence Map: `docs/diagrams/SYSTEM_EVIDENCE.md`
   - Traceability Matrix: `docs/diagrams/DIAGRAM_TRACEABILITY.md`
   - Master Mermaid Source: `docs/diagrams/DIAGRAMS_MERMAID.md`
