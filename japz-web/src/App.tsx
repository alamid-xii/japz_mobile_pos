import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
const Welcome = lazy(() => import('./pages/Welcome'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const RoleSelection = lazy(() => import('./pages/RoleSelection'));
const AdminLayout = lazy(() => import('./layouts/AdminLayout'));
const CashierLayout = lazy(() => import('./layouts/CashierLayout'));
const KitchenLayout = lazy(() => import('./layouts/KitchenLayout'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const Employees = lazy(() => import('./pages/admin/Employees'));
const MenuInventory = lazy(() => import('./pages/admin/MenuInventory'));
const Stocks = lazy(() => import('./pages/admin/Stocks'));
const Settings = lazy(() => import('./pages/admin/Settings'));
const FeedbackHub = lazy(() => import('./pages/admin/FeedbackHub'));
const SalesForecast = lazy(() => import('./pages/admin/SalesForecast'));
const DiscountsVouchers = lazy(() => import('./pages/admin/DiscountsVouchers'));
const POS = lazy(() => import('./pages/cashier/POS'));
const ActiveOrders = lazy(() => import('./pages/cashier/ActiveOrders'));
const OrderHistory = lazy(() => import('./pages/cashier/OrderHistory'));
const PaymentSelection = lazy(() => import('./pages/cashier/PaymentSelection'));
const CashPayment = lazy(() => import('./pages/cashier/CashPayment'));
const Receipt = lazy(() => import('./pages/cashier/Receipt'));
const MenuBoard = lazy(() => import('./pages/cashier/MenuBoard'));
const Profile = lazy(() => import('./pages/cashier/Profile'));
const KitchenIncoming = lazy(() => import('./pages/kitchen/Incoming'));
const KitchenCompleted = lazy(() => import('./pages/kitchen/Completed'));
const KitchenProfile = lazy(() => import('./pages/kitchen/Profile'));
const Feedback = lazy(() => import('./pages/public/Feedback'));
import './index.css';
const InventoryLayout = lazy(() => import('./features/inventory/InventoryLayout'));
const InventoryOverview = lazy(() => import('./features/inventory/Overview'));
const Supplies = lazy(() => import('./features/inventory/Supplies'));
const Receiving = lazy(() => import('./features/inventory/Receiving'));
const Counts = lazy(() => import('./features/inventory/CountsLosses').then(m => ({ default: m.Counts })));
const Losses = lazy(() => import('./features/inventory/CountsLosses').then(m => ({ default: m.Losses })));
const Suppliers = lazy(() => import('./features/inventory/Suppliers'));
const PreparedStock = lazy(() => import('./features/inventory/MenuStock').then(m => ({ default: m.PreparedStock })));
const MenuAvailability = lazy(() => import('./features/inventory/MenuStock').then(m => ({ default: m.MenuAvailability })));
const Movements = lazy(() => import('./features/inventory/HistoryReports').then(m => ({ default: m.Movements })));
const Reports = lazy(() => import('./features/inventory/HistoryReports').then(m => ({ default: m.Reports })));
const InventoryGuide = lazy(() => import('./features/inventory/Guide'));
const KitchenWaste = lazy(() => import('./features/inventory/KitchenWaste'));
const InventoryProfile = lazy(() => import('./features/inventory/Profile'));
const InventorySettingsPage = lazy(() => import('./features/inventory/Settings'));
import { FeedbackProvider } from './components/FeedbackProvider';
import RouteAnnouncement from './components/RouteAnnouncement';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <FeedbackProvider>
        <RouteAnnouncement />
        <Suspense fallback={<div className="spinner" role="status" aria-label="Loading page" />}><Routes>
          {/* Public Routes - Redirect logged-in users to their dashboard */}
          <Route path="/" element={<PublicRoute><Welcome /></PublicRoute>} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
          <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />
          <Route path="/role-selection" element={<PublicRoute><RoleSelection /></PublicRoute>} />

          {/* Customer Feedback - Fully Public (no auth check) */}
          <Route path="/feedback" element={<Feedback />} />

          {['/inventory', '/admin/inventory'].map(path => (
            <Route key={path} path={path} element={<ProtectedRoute allowedRoles={path.startsWith('/admin') ? ['admin'] : ['inventory', 'admin']}><InventoryLayout /></ProtectedRoute>}>
              <Route index element={<Navigate to="overview" replace />} />
              <Route path="overview" element={<InventoryOverview />} />
              <Route path="supplies" element={<Supplies />} />
              <Route path="receiving" element={<Receiving />} />
              <Route path="prepared" element={<PreparedStock />} />
              <Route path="menu" element={<MenuAvailability />} />
              <Route path="counts" element={<Counts />} />
              <Route path="losses" element={<Losses />} />
              <Route path="suppliers" element={<Suppliers />} />
              <Route path="movements" element={<Movements />} />
              <Route path="reports" element={<Reports />} />
              <Route path="guide" element={<InventoryGuide />} />
              <Route path="profile" element={<InventoryProfile />} />
              <Route path="settings" element={<InventorySettingsPage />} />
            </Route>
          ))}

          {/* Admin Routes - Protected */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="employees" element={<Employees />} />
            <Route path="menu" element={<MenuInventory />} />
            <Route path="stocks" element={<Stocks />} />
            <Route path="feedback" element={<FeedbackHub />} />
            <Route path="sales" element={<SalesForecast />} />
            <Route path="discounts-vouchers" element={<DiscountsVouchers />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Cashier Routes - Protected */}
          <Route path="/cashier" element={
            <ProtectedRoute allowedRoles={['cashier']}>
              <CashierLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="pos" replace />} />
            <Route path="pos" element={<POS />} />
            <Route path="orders" element={<ActiveOrders />} />
            <Route path="history" element={<OrderHistory />} />
            <Route path="payment" element={<PaymentSelection />} />
            <Route path="cash-payment" element={<CashPayment />} />
            <Route path="receipt" element={<Receipt />} />
            <Route path="menuboard" element={<MenuBoard />} />
            <Route path="profile" element={<Profile />} />
          </Route>

          {/* Kitchen Routes - Protected */}
          <Route path="/kitchen" element={
            <ProtectedRoute allowedRoles={['kitchen']}>
              <KitchenLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="incoming" replace />} />
            <Route path="incoming" element={<KitchenIncoming />} />
            <Route path="completed" element={<KitchenCompleted />} />
            <Route path="profile" element={<KitchenProfile />} />
            <Route path="waste" element={<KitchenWaste />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes></Suspense>
        </FeedbackProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
