---
name: Backend API & Code Standards
description: Rules for writing Express controllers, routes, and API responses. Full payroll documentation is in docs/payroll/.
---

# Backend API & Code Standards

> **Full Documentation:** See `docs/payroll/CODING_STANDARDS.md` for the complete coding standards.
> For payroll-specific rules, read `docs/payroll/AI_AGENT_RULES.md` before writing any code.

## 1. Standardized API Responses
EVERY controller must use this exact JSON structure — no exceptions:

**Success:**
```json
{ "success": true, "data": { ... }, "message": "Optional" }
```
**Error:**
```json
{ "success": false, "message": "User-friendly message" }
```

## 2. Mandatory Error Handling
*   Every async controller function MUST use `try/catch`.
*   Never let an unhandled promise crash the server.
*   Always return a JSON error response in the `catch` block.

## 3. Thin Controllers
*   Controllers read `req.body`/`req.params`, call a service, return `res.json()`.
*   No business logic in controllers. No calculation logic in controllers.
*   All complex logic goes into `services/` files.

## 4. Environment Variables
*   Never hardcode secrets (DB passwords, JWT secrets). Always use `process.env`.
*   Any new env variable must be added to `.env.example` immediately.

## 5. Payroll-Specific Backend Rules
*   Use `sequelize.transaction()` for any payroll operation that writes to multiple tables.
*   Apply `verifyToken` + `requireAdmin` middleware to all `/api/payroll/*` routes.
*   Never pass `req.body` directly into Sequelize `create()` or `update()` — always pick explicit fields.
*   All payroll calculation logic lives in `services/payrollCalculator.js` only.
*   Use `createLog()` from `utils/logger.js` for all audit-worthy payroll actions.

