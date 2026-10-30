# ADVANCED_PLAN.md — Advanced Payroll Roadmap

> **Status:** Roadmap & Vision
> **Last Updated:** 2026-10-06
> **Purpose:** Outline the long-term advanced features for the JAPZ Payroll Module after the core foundation is built.

---

## Phase 1: Core Foundation (Current Focus)
1. **Dynamic Configs:** Admin can set grace period, multipliers, and regular hours without changing code.
2. **Attendance Fixes:** Fix the `TIME` vs `DATETIME` overnight shift issue.
3. **Core Payroll Engine:** The deterministic, pure `PayrollCalculator` running on the backend.
4. **Historical Snapshots:** Saving the employee's rate into the `PayrollEntry` to preserve auditability.
5. **Admin Dashboard:** Basic UI to generate, review, and approve periods.

---

## Phase 2: Employee Self-Service & Transparency
Once the admin side works perfectly, we open it up to employees to reduce admin workload.

- [ ] **Employee Portal:** Employees can log in and view a dashboard of their past payslips.
- [ ] **Dispute System:** Employees can "flag" a draft/calculated payslip if they believe their hours are wrong, halting the approval until the admin reviews it.
- [ ] **Digital Signature/Ack:** Employees click an "Acknowledge" button on their payslip, recording a timestamp that they've seen and accepted it.

---

## Phase 3: Advanced Attendance Integrations
Moving beyond simple manual clock in/out.

- [ ] **Geofenced Clock-in:** Frontend UI prevents clocking in if the device's GPS is not within a set radius of the restaurant.
- [ ] **Biometric/PIN Integration:** Require a unique manager PIN override for clocking in outside the grace period.
- [ ] **Break Time Tracking:** Add separate "Start Break" and "End Break" buttons to strictly track paid vs unpaid breaks.

---

## Phase 4: Government & Tax Compliance (PH Context)
Currently, statutory deductions are TBD. To make this a production-ready enterprise system, we need dynamic tax tables.

- [ ] **SSS / PhilHealth / Pag-IBIG Tables:** Load the official government brackets into the `PayrollConfigs` database so the system automatically computes exact deductions based on gross pay.
- [ ] **Withholding Tax Calculator:** Implement the BIR tax tiers.
- [ ] **Annualization:** Calculate 13th-month pay automatically based on the accumulated basic pay from Jan to Dec.

---

## Phase 5: Smart Financial Analytics
Turning payroll data into business intelligence for the restaurant owner.

- [ ] **Labor Cost Percentage:** Compare total gross payroll for a period against total Sales (from the existing POS Orders table) to show the Labor Cost %.
- [ ] **Overtime Heatmap:** Identify which days/shifts cause the most overtime to help the admin optimize the schedule.
- [ ] **Automated PDF Export & Bank CSV:** Generate the exact CSV format required by the bank for batch salary disbursement.

---

## Implementation Strategy for Advanced Features
- **Do NOT** build these right now.
- Keep the `DATABASE_SCHEMA.md` and `PAYROLL_ARCHITECTURE.md` clean and modular so these can be plugged in later.
- For example, Phase 5 (Analytics) is why we MUST have accurate historical snapshots (Phase 1) — if past rates change, our historical labor cost analytics would be ruined.
