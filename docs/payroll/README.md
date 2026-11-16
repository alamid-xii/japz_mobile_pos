# JAPZ Payroll Module — Documentation Index

> **Created:** 2026-10-06
> **Status:** Foundation Documentation Complete — Awaiting Approval Before Implementation

This directory contains all planning, architecture, rules, and guidelines for the **Payroll Management** module of the JAPZ Restaurant Management System.

---

## Document Map

| # | File | Purpose | Priority |
|---|---|---|---|
| 1 | [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) | Project overview, tech stack, architecture, non-negotiable principles | 🔴 Read First |
| 2 | [AI_AGENT_RULES.md](./AI_AGENT_RULES.md) | Rules that govern all AI-assisted development | 🔴 Read First |
| 3 | [CURRENT_TASK.md](./CURRENT_TASK.md) | Template — fill in for each new development task | 🔴 Always Current |
| 4 | [PAYROLL_RULES.md](./PAYROLL_RULES.md) | Business rules: compensation, earnings, deductions, integrity | 🔴 Required |
| 5 | [ATTENDANCE_RULES.md](./ATTENDANCE_RULES.md) | How attendance data is captured, validated, and used in payroll | 🔴 Required |
| 6 | [PAYROLL_FORMULAS.md](./PAYROLL_FORMULAS.md) | **All** financial formulas, centralized. Single source of truth. | 🔴 Required |
| 7 | [PAYROLL_WORKFLOW.md](./PAYROLL_WORKFLOW.md) | Payroll lifecycle, status machine, allowed/forbidden transitions | 🔴 Required |
| 8 | [PAYROLL_PERMISSIONS.md](./PAYROLL_PERMISSIONS.md) | Role × permission matrix | 🔴 Required |
| 9 | [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) | Existing tables + proposed new tables for payroll | 🟡 Before coding models |
| 10 | [PAYROLL_ARCHITECTURE.md](./PAYROLL_ARCHITECTURE.md) | Layered code architecture, service design, component design | 🟡 Before coding services |
| 11 | [EDGE_CASES.md](./EDGE_CASES.md) | Comprehensive checklist of edge cases with classifications | 🟡 Reference |
| 12 | [TESTING_PLAN.md](./TESTING_PLAN.md) | Unit tests, integration tests, golden scenarios | 🟡 Before implementation |
| 13 | [DEFINITION_OF_DONE.md](./DEFINITION_OF_DONE.md) | Completion criteria checklist for every feature | 🟡 Every feature |
| 14 | [CODING_STANDARDS.md](./CODING_STANDARDS.md) | File naming, API conventions, error handling, payroll-specific rules | 🟡 Reference |
| 15 | [SECURITY_RULES.md](./SECURITY_RULES.md) | Auth, authorization, audit trails, input validation | 🟡 Every feature |
| 16 | [TECH_DEBT.md](./TECH_DEBT.md) | Known issues discovered during planning — fix deliberately | 🟡 Reference |
| 17 | [DECISIONS.md](./DECISIONS.md) | Architecture Decision Records | 🟡 Reference |

---

## TBD Items (Must Resolve Before Implementation)

See the full list in the [summary response], but the blockers are:

1. **Pay frequency** — Semi-monthly? Weekly? Monthly?
2. **Regular hours per day** — 8 hours assumed, confirm.
3. **Grace period** — How many minutes before late deduction applies?
4. **Overtime multiplier** — 1.25×? 1.5×? Per PH labor law?
5. **Statutory deductions** — Will SSS, PhilHealth, Pag-IBIG be included?

---

## Recommended First Implementation Task

**Step 1:** Resolve the 🔴 Critical tech debt items (TD-01, TD-02, TD-06 from `TECH_DEBT.md`).
**Step 2:** Build and test the `PayrollCalculator` service with the Golden Scenarios.
**Step 3:** Build `AttendanceService` (clock-in/out).
