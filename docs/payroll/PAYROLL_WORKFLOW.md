# PAYROLL_WORKFLOW.md — Payroll Lifecycle & Status Machine

> **Status:** Foundation Documentation
> **Last Updated:** 2026-10-06
> **Related Documents:** [PAYROLL_RULES.md](./PAYROLL_RULES.md), [PAYROLL_PERMISSIONS.md](./PAYROLL_PERMISSIONS.md)

---

## 1. High-Level Payroll Lifecycle

```
Employee Setup (rate configured)
        ↓
Shift Assignment (TBD)
        ↓
Attendance Recording (clock in/out each day)
        ↓
Attendance Validation (admin reviews, corrects missing punches)
        ↓
Open Payroll Period (admin defines pay period dates)
        ↓
Gather Eligible Employees (active employees in this period)
        ↓
Calculate Payroll  →  Status: CALCULATED
        ↓
Review Payroll (admin reviews each employee's entry)  →  Status: UNDER_REVIEW
        ↓
Apply Manual Adjustments (if needed)
        ↓
Recalculate (if allowed — only before APPROVED)
        ↓
Approve Payroll  →  Status: APPROVED
        ↓
Generate Payslips (PDF or on-screen payslip for each employee)
        ↓
Mark Payroll as Paid  →  Status: PAID
        ↓
Lock Payroll Period  →  Status: LOCKED
```

---

## 2. Payroll Period Statuses

### Status Definitions

| Status | Meaning |
|---|---|
| `DRAFT` | Payroll period has been opened but calculation has not been run yet. |
| `CALCULATED` | Payroll has been calculated for all eligible employees. Entries can be reviewed. |
| `UNDER_REVIEW` | Admin is actively reviewing entries. Recalculation still allowed. |
| `APPROVED` | Admin has approved the payroll. No automatic recalculation allowed. |
| `PAID` | Payment has been marked as disbursed. Immutable financial record. |
| `LOCKED` | Payroll period is fully closed and archived. No further modifications. |
| `CANCELLED` | Payroll period was cancelled before reaching PAID. Requires documented reason. |

---

## 3. Status Transition Matrix

### Allowed Transitions

```
DRAFT        → CALCULATED   (run payroll calculation)
DRAFT        → CANCELLED    (cancel before calculating)
CALCULATED   → UNDER_REVIEW (admin opens for review)
CALCULATED   → DRAFT        (reset to recalculate fresh — only if no entries are APPROVED)
UNDER_REVIEW → APPROVED     (admin approves all entries)
UNDER_REVIEW → CALCULATED   (return for recalculation)
APPROVED     → PAID         (mark as disbursed)
APPROVED     → UNDER_REVIEW (reopen — authorized admin only, logged)
PAID         → LOCKED       (archive)
PAID         → (cannot return to any prior status — adjustment entries only)
LOCKED       → (terminal — no transitions allowed)
CANCELLED    → (terminal — no transitions allowed)
```

### Forbidden Transitions

| From | To | Reason |
|---|---|---|
| `PAID` | `DRAFT` | Historical payroll must not be destroyed. |
| `PAID` | `CALCULATED` | Historical payroll must not be destroyed. |
| `LOCKED` | any | LOCKED is terminal and permanent. |
| `CANCELLED` | any | CANCELLED is terminal. |
| `APPROVED` | `DRAFT` | Approved payroll must go through a reopen workflow. |

---

## 4. Per-Status: Allowed Actions & Permissions

### DRAFT
| Action | Who |
|---|---|
| Edit pay period dates | admin |
| Add/remove employees from period | admin |
| Run payroll calculation | admin |
| Cancel payroll period | admin |
| **Not allowed:** View calculated amounts (none yet) | — |

### CALCULATED
| Action | Who |
|---|---|
| View calculated entries | admin |
| Mark period as UNDER_REVIEW | admin |
| Reset to DRAFT (full recalculate) | admin |
| Cancel payroll period | admin |

### UNDER_REVIEW
| Action | Who |
|---|---|
| View all payroll entries | admin |
| Add manual adjustment to an entry | admin |
| Recalculate individual entry | admin |
| Recalculate all entries | admin |
| Approve payroll | admin |
| Return to CALCULATED | admin |

### APPROVED
| Action | Who |
|---|---|
| View approved entries | admin |
| Generate / view payslips | admin |
| Mark as PAID | admin |
| Reopen to UNDER_REVIEW | admin (with audit log + reason required) |
| **Not allowed:** Automatic recalculation | — |

### PAID
| Action | Who |
|---|---|
| View payslips | admin |
| Employees view own payslip | employee (TBD) |
| Lock the period | admin |
| Create adjustment entries | admin (separate records, does not modify original) |
| **Not allowed:** Edit original payroll entries | — |

### LOCKED
| Action | Who |
|---|---|
| View historical records | admin |
| View historical payslips | admin, employee (TBD) |
| Export payroll data | admin |
| **Not allowed:** Any modification | — |

### CANCELLED
| Action | Who |
|---|---|
| View cancelled period record | admin |
| **Not allowed:** Any modification or restoration | — |

---

## 5. Reopen Workflow (APPROVED → UNDER_REVIEW)

Reopening an approved payroll is a sensitive action. It must follow this controlled process:

1. Admin explicitly initiates reopen on the specific payroll period.
2. System requires a **written reason** before allowing the transition.
3. System writes a log entry via `createLog()` with:
   - `action: 'PAYROLL_REOPEN'`
   - `userId`: the admin who reopened
   - `entityId`: the payroll period ID
   - `description`: the reason provided
   - `changes`: `{ from: 'APPROVED', to: 'UNDER_REVIEW' }`
4. Status changes to `UNDER_REVIEW`.
5. Payslips generated from the APPROVED state are marked as **superseded**.

---

## 6. Adjustment Entries (Post-PAID)

When a paid payroll entry needs correction (e.g., missed overtime, incorrect deduction):

- Do **not** edit the original `payroll_entries` record.
- Create a new `payroll_adjustments` record that references the original entry.
- The adjustment record stores: the type of adjustment, the amount (positive or negative), reason, and approving admin.
- Adjustments are processed in the **next payroll period** or as a separate off-cycle payment: TBD.
