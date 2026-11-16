# JAPZ Inventory - Verified System Architecture

Verified from the new supplied GitDiagram architecture and the implemented Inventory source. Browser components, backend responsibilities, shared model dependencies and direct POS/Kitchen boundaries are corrected.

```mermaid
%% Verified from the NEW GitDiagram architecture supplied in INVENTORY_ARCHITECTURE.md.
%% Corrections describe the actual modular monolith; no new runtime modules are introduced.
flowchart TD
  staff(("Inventory Staff / Admin"))
  subgraph browser["Browser - Inventory Web (React / TypeScript / Vite)"]
    app["Inventory Routes and Layout<br/>App.tsx / InventoryLayout.tsx"]
    login["Sign-in<br/>Login.tsx"]
    auth["Auth Context<br/>useAuth.tsx"]
    guard["UI Role Guard<br/>ProtectedRoute.tsx"]
    screens["Inventory Screens<br/>Supplies / Receiving / Counts / Losses / Suppliers"]
    menuui["Menu Stock and Recipes<br/>MenuStock.tsx"]
    shared["Shared Controls<br/>shared.tsx"]
    provider["Inventory Data Provider<br/>InventoryData.tsx"]
    helpers["Context / Pagination / CSV Helpers<br/>data.ts / pagination.ts"]
    reports["Reports and Browser CSV Downloads<br/>HistoryReports.tsx"]
    api["HTTP Client<br/>api.ts - Axios / bearer token"]
    app --> guard
    app --> auth
    app --> screens
    app --> menuui
    app --> reports
    app --> provider
    login --> auth
    guard --> auth
    screens --> provider
    menuui --> provider
    reports --> provider
    provider --> helpers
    provider --> api
    helpers --> api
    menuui --> shared
    screens --> shared
    reports --> helpers
    auth --> api
  end
  subgraph backend["Node.js / Express - API and Identity"]
    runtime["Express Runtime<br/>index.js"]
    sharedroutes["Shared API Routes<br/>routes/index.js"]
    invroutes["Inventory API<br/>routes/inventory.js"]
    access["JWT / Approved User / Role Checks<br/>middleware/access.js"]
    user["Shared Identity Model<br/>models/userModel.js"]
    runtime -->|mounts| sharedroutes
    sharedroutes -->|mounts /api/inventory| invroutes
    sharedroutes -->|protected shared routes| access
    invroutes -->|authenticate / allowRoles| access
    access -->|reloads approved identity| user
    sharedroutes -->|login / profile| user
  end
  subgraph domain["Inventory Domain - Existing Services"]
    stock["Stock Operations<br/>inventoryService.js"]
    availability["Recipes and Menu Availability<br/>menuAvailability.js"]
    settings["Inventory Settings and Policies<br/>inventorySettings.js"]
    orders["POS / Kitchen Stock Lifecycle<br/>inventoryOrders.js"]
    invroutes --> stock
    invroutes --> availability
    invroutes --> settings
    sharedroutes -->|public availability| availability
    sharedroutes -->|order creation / status| orders
    orders -->|movement helpers| stock
    orders -->|menu requirements| availability
    settings -->|validation / errors| stock
    availability -->|quantity / validation helpers| stock
  end
  subgraph persistence["Sequelize Persistence"]
    imodels["12 Inventory Models<br/>inventoryModels.js"]
    smodels["Directly Shared Models<br/>MenuItem / MenuCategory / Order / OrderItem / Payment / Log"]
    registry["Model Associations<br/>models/index.js"]
    db["Sequelize Connection<br/>models/db.js"]
    registry --> imodels
    registry --> smodels
    registry --> user
    imodels --> db
    smodels --> db
    user --> db
  end
  mysql[("MySQL<br/>japz_pos in the main project")]
  cashier(("Cashier / POS boundary"))
  kitchen(("Kitchen boundary"))
  staff -->|uses| app
  api -->|HTTP JSON + bearer token| runtime
  runtime -->|loads associations| registry
  stock -->|models and transactions| imodels
  stock -->|prepared menu quantities| smodels
  availability -->|supplies / batches / recipes| imodels
  availability -->|menu and categories| smodels
  settings -->|InventorySettings| imodels
  orders -->|allocations and movements| imodels
  orders -->|orders / items / payment records| smodels
  stock -->|transactions| db
  availability -->|transactions| db
  settings -->|transactions| db
  orders -->|transactions| db
  db -->|MySQL protocol| mysql
  cashier -->|order creation / cart checks| sharedroutes
  kitchen -->|order status changes| sharedroutes
  kitchen -->|waste reports| invroutes
  classDef web fill:#dbeafe,stroke:#2563eb,color:#172554
  classDef server fill:#fef3c7,stroke:#d97706,color:#78350f
  classDef service fill:#dcfce7,stroke:#16a34a,color:#14532d
  classDef data fill:#ffe4e6,stroke:#e11d48,color:#881337
  classDef boundary fill:#e0e7ff,stroke:#4f46e5,color:#312e81
  class app,login,auth,guard,screens,menuui,shared,provider,helpers,reports,api web
  class runtime,sharedroutes,invroutes,access server
  class stock,availability,settings,orders service
  class user,imodels,smodels,registry,db,mysql data
  class staff,cashier,kitchen boundary
```

The initial GitDiagram Mermaid is preserved in `output/inventory-diagrams-reviewed/_work/original-INVENTORY_ARCHITECTURE.md`. The Word-ready figure and all 17 finalized diagrams are in `output/inventory-diagrams-reviewed`.
