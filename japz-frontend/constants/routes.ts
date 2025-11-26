// constants/routes.ts
export const ROUTES = {
  AUTH: {
    WELCOME: '/WelcomeScreen',
    LOGIN: '/Login', 
    REGISTRATION: '/Registration',
    ROLE_SELECTION: '/RoleSelection',
  },
  ADMIN: {
    DASHBOARD: '/AdminDashboard',
    EMPLOYEES: '/EmployeeManagement',
    CATEGORIES: '/CategoryManagement',
    MENU_INVENTORY: '/MenuInventoryManagement',
    SALES_FORECAST: '/SalesForecast',
    FEEDBACK_HUB: '/FeedbackHub',
    SETTINGS: '/SystemSettings',
  },
  CASHIER: {
    POS: '/POSDashboard',
    ACTIVE_ORDERS: '/ActiveOrders',
    ORDER_HISTORY: '/OrderHistory',
    PAYMENT_SELECTION: '/PaymentSelection',
    CASH_PAYMENT: '/CashPayment',
    RECEIPT: '/Receipt',
  },
  KITCHEN: {
    DISPLAY: '/KitchenDisplay',
  },
} as const;