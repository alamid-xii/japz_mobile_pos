# JAPZ Inventory - review and correction record

Reviewed the user's `FAJUTAGANA_17_DIAGRAMS.docx`, `INVENTORY_ARCHITECTURE.md` and supplied `diagram.png` against the Inventory implementation in the main JAPZ project. The new GitDiagram architecture is the architectural baseline; the older architecture embedded in the Word document has been replaced. The other 16 figures were reviewed independently against their relevant models, services, routes, components, configuration and existing tests.

The source baseline is main-project commit `0f912e9ed18fb49eeb8a4b0a8ab16ba50a7f2cda`, with Inventory source still matching that committed baseline. The separately published repository is an extraction, not evidence that the original system is deployed as independently hosted microservices. No application implementation was edited for this documentation task.

## New GitDiagram architecture corrections

- Put the web components inside the browser execution boundary. Axios communicates directly with Express over HTTP/JSON; the browser is not an additional external network hop after the client.
- Identify `InventoryData.tsx` as the provider and `data.ts` as context/helpers. Retain route/layout, sign-in/auth context, role guard, Inventory screens, menu-stock controls and HTTP client from the new diagram's component inventory.
- Separate frontend route protection from server JWT, approved-account and role enforcement. `access.js` reloads the actual approved User for protected requests.
- Correct the ownership of CSV downloads, visible alerts and refresh scheduling: these are frontend functions. Backend routes expose the records/summary/settings used by those functions.
- Add persistence dependencies for settings and order-allocation services and identify the actual shared models. A shared Order model alone does not explain the menu/category, user, order-item and payment dependencies.
- Route direct POS/Kitchen requests through the shared/Inventory APIs. Their domain-service calls are server-side collaboration, not direct browser access to internal service modules.
- Keep MySQL as the required persistence integration. Supplier contacts and stored payment methods do not establish supplier APIs or payment gateways; unrelated email, Google Sheets, AI, forecasting and staff-management features are outside this Inventory view.

Figure 1 is a readable, monochrome rendering of this verified new architecture for the user's existing Word style. The accompanying Mermaid source retains a more detailed component-level view and the GitDiagram colors.

## Individual diagram decisions

| No. | Diagram | Review result / final correction | Primary implementation evidence |
| --- | --- | --- | --- |
| 1 | System Architecture | Replace old Word architecture using the supplied new GitDiagram baseline; correct execution boundaries, provider, auth, CSV ownership and persistence dependencies. | `App.tsx`, `InventoryLayout.tsx`, `InventoryData.tsx`, `data.ts`, `api.ts`, backend `index.js`, both route files, domain services and `models/index.js` |
| 2 | Class | Preserve six-class receiving view; add StockItem-to-ReceiptLine and optional StockItem-to-Movement associations. Clarify prepared MenuItem movements and workflow versus SQL cardinality. | `models/inventoryModels.js`, `models/index.js`, `inventoryService.js` receiving workflow |
| 3 | Component | Correct API, authorization, domain and persistence dependencies; locate CSV/refresh in the frontend. Use logical components without invented deployed services. | `routes/inventory.js`, `middleware/access.js`, Inventory frontend and domain-service imports |
| 4 | Deployment | Preserve local scope and ports; draw separate Browser-to-Vite and Browser-to-Express communication paths. Show backend-to-MySQL access only. | `start-local.ps1`, backend `index.js`, `models/db.js`, frontend package/configuration |
| 5 | Object | Preserve the illustrative flour snapshot; add the missing stockItemId and instance link. Keep values explicitly illustrative. | `StockReceiptLine` fields; `receiveStock` unit conversion and record writes |
| 6 | Package | Replace invented source-package names with actual folder responsibilities and import dependencies; distinguish the HTTP contract and MySQL service. | Frontend `features/inventory`, shared client folders, backend `routes`, `middleware`, `services`, `models` |
| 7 | Composite Structure | Original figure retained byte-for-byte. Clarify its scope as the receiving collaboration and its parts as logical module roles. | `authenticate`, protected receive route, `receiveStock`, model access |
| 8 | Profile | Replace incorrect extensions to enumerations with solid, filled-triangle extensions to Class, Component and Operation metaclasses. Include actual movement action literals. Mark profile as a documentation convention. | `inventoryModels.js` enums; `inventoryService.js` invariants; OMG UML Profiles notation |
| 9 | Data Flow | Add explicit master/policy, receiving/loss/review, order-allocation and reporting flows; label data, add store identifier compartments and direct Kitchen/POS boundary inputs. | Inventory routes, `inventoryService.js`, `inventoryOrders.js`, `HistoryReports.tsx` |
| 10 | Use Case | Preserve Staff goals; clarify Admin-only count approval/reversals/policies and Staff alert/refresh settings. Include direct Kitchen/Cashier interactions without their full modules. | Inventory `allowRoles` guards, `inventorySettings.js`, `CountsLosses.tsx` |
| 11 | Activity | Keep stock versus report choice; include validation failure, rollback/correction, pending-count handling, a merge node and denied-access termination. | Receiving/count/loss services and frontend submission/refresh/report handlers |
| 12 | Sequence | Correct authorization, transaction and identity lookup order. Create one receipt outside the per-line loop; show matching replay, new success and rollback/conflict branches. | `inventoryOperation` at `inventoryService.js:111`; `receiveStock` at `:390`; `Receiving.tsx` |
| 13 | State Machine | Preserve actual pending/applied/rejected/stale states. Add Admin-approve trigger and clarify initial invalid submissions do not create a stale record. | `countStock` at `inventoryService.js:597`; `reviewCount` at `:678` |
| 14 | Communication | Separate middleware participant and correct nested message sequence, repeated line writes, saved result and commit responsibilities. | Receive route, access middleware, `receiveStock`, `inventoryOperation` |
| 15 | Interaction Overview | Replace misleading mini-lifelines in ref frames with real interaction-use references and guarded success/error decisions. | Authentication, receiving and data-refresh components |
| 16 | Timing | Preserve the existing participant activity plot; label active/idle levels and retain the explicit illustrative, non-benchmark time scale. | Causal order in `Receiving.tsx`, access middleware and transactional service |
| 17 | Requirement (SysML) | Preserve five derived requirements; add Id/Text properties, precise direct-write permissions and satisfy links from actual implementation artifacts. | Access/routes, receiving, availability/order, counts/review and movement logic; OMG SysML requirements notation |

## Static trace to existing tests

The main project's `japz-backend/tests/inventory.test.js` contains relevant cases for role-controlled stock writes, idempotent receiving/order requests, atomic concurrent updates, FEFO/expiry/holds, recipe versions, stale counts/settings and append-only loss/reversal history. Those cases were read as supporting evidence. No new application test run or production acceptance is claimed by this document review.

- INV-01: `only approved Inventory and Admin can change stock or manage recipes`; role-specific route guards.
- INV-02: `receiving converts purchase units, records lot costs, and retries only once`; `parallel receipts preserve every quantity and failed multi-line receipts roll back`.
- INV-03: `recipe availability and cart limits include shared ingredients and packaging`; `expiry, batch hold and FEFO control allocations`.
- INV-04: `physical counts detect stale balances, require configured approval and preserve reserved stock`; settings/version conflict tests.
- INV-05: `waste, supplier return and reversal append movements and cannot consume reservations`.

## Document preservation and validation

The original document's title, personal header, footer, caption texts, diagram order, Arial formatting, first-line description indents, paragraph spacing, A4 geometry and margins are retained. Only the document body text/drawing metadata and corrected figure media were edited in the updated copy. No document-wide redesign or generic template was applied.

The original Downloads document remains unchanged; its SHA-256 is `1CE2035B0F24FFC7879FBFE04726B1934F6425428659E36FAD1547CE25A2D1C2`. The updated document is rendered using Microsoft Word. The final package includes 17 PNGs, 17 SVGs, 17 individual draw.io sources, a combined 17-tab draw.io source, the verified architecture Mermaid source and a machine-readable diagram model.

The original profile and illustrative values are documentation models, local deployment is configuration evidence, and timing is illustrative. None should be presented as a verified extra runtime feature or production measurement.

Notation references: [OMG UML 2.5.1](https://www.omg.org/spec/UML/2.5.1), [OMG SysML 1.6](https://www.omg.org/spec/SysML/1.6). DFD figures use numbered processes, external entities, data stores and named data-flow arrows, rather than UML control-flow notation.
