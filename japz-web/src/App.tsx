import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import Welcome from './pages/Welcome';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import RoleSelection from './pages/RoleSelection';
import AdminLayout from './layouts/AdminLayout';
import CashierLayout from './layouts/CashierLayout';
import KitchenLayout from './layouts/KitchenLayout';
import Dashboard from './pages/admin/Dashboard';
import Employees from './pages/admin/Employees';
import MenuInventory from './pages/admin/MenuInventory';
import Stocks from './pages/admin/Stocks';
import Settings from './pages/admin/Settings';
import FeedbackHub from './pages/admin/FeedbackHub';
import SalesForecast from './pages/admin/SalesForecast';
import DiscountsVouchers from './pages/admin/DiscountsVouchers';
import POS from './pages/cashier/POS';
import ActiveOrders from './pages/cashier/ActiveOrders';
import OrderHistory from './pages/cashier/OrderHistory';
import PaymentSelection from './pages/cashier/PaymentSelection';
import CashPayment from './pages/cashier/CashPayment';
import Receipt from './pages/cashier/Receipt';
import MenuBoard from './pages/cashier/MenuBoard';
import Profile from './pages/cashier/Profile';
import KitchenIncoming from './pages/kitchen/Incoming';
import KitchenCompleted from './pages/kitchen/Completed';
import KitchenProfile from './pages/kitchen/Profile';
import ReadyOrders from './pages/cashier/ReadyOrders';
import PrepBoard from './pages/kitchen/PrepBoard';
import RiderDeliveries from './pages/rider/Deliveries';
import Feedback from './pages/public/Feedback';
import StorefrontLayout from './pages/public/storefront/StorefrontLayout';
import StorefrontHome from './pages/public/storefront/Home';
import StorefrontMenu from './pages/public/storefront/MenuPage';
import StorefrontCart from './pages/public/storefront/CartPage';
import StorefrontTrack from './pages/public/storefront/TrackPage';
import StorefrontAuth from './pages/public/storefront/AuthPage';
import StorefrontProfile from './pages/public/storefront/ProfilePage';
import './index.css';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes - Redirect logged-in users to their dashboard */}
          <Route path="/" element={<PublicRoute><Welcome /></PublicRoute>} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
          <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />
          <Route path="/role-selection" element={<PublicRoute><RoleSelection /></PublicRoute>} />

          {/* Customer Feedback - Fully Public (no auth check) */}
          <Route path="/feedback" element={<Feedback />} />

          {/* ---------------------------------------------------------------
              CUSTOMER STOREFRONT - separate public entry point with its own
              top/bottom navigation shell. /japz is canonical; /order/* stays
              mounted so QR codes already in the wild keep working.
          ---------------------------------------------------------------- */}
          {['/japz', '/order'].map(prefix => (
            <Route key={prefix} path={prefix} element={<StorefrontLayout />}>
              <Route index element={<StorefrontHome />} />
              <Route path="menu" element={<StorefrontMenu />} />
              <Route path="cart" element={<StorefrontCart />} />
              <Route path="track" element={<StorefrontTrack />} />
              <Route path="track/:orderNumber" element={<StorefrontTrack />} />
              <Route path="auth" element={<StorefrontAuth />} />
              <Route path="profile" element={<StorefrontProfile />} />
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
            <Route path="ready" element={<ReadyOrders />} />
            <Route path="history" element={<OrderHistory />} />
            <Route path="payment" element={<PaymentSelection />} />
            <Route path="cash-payment" element={<CashPayment />} />
            <Route path="receipt" element={<Receipt />} />
            <Route path="menuboard" element={<MenuBoard />} />
            <Route path="profile" element={<Profile />} />
          </Route>

          {/* Rider Routes - Protected. Riders reach nothing else in the app. */}
          <Route path="/rider" element={
            <ProtectedRoute allowedRoles={['rider']}>
              <RiderDeliveries />
            </ProtectedRoute>
          } />
          <Route path="/rider/deliveries" element={
            <ProtectedRoute allowedRoles={['rider']}>
              <RiderDeliveries />
            </ProtectedRoute>
          } />

          {/* Kitchen Routes - Protected */}
          <Route path="/kitchen" element={
            <ProtectedRoute allowedRoles={['kitchen']}>
              <KitchenLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="incoming" replace />} />
            <Route path="incoming" element={<KitchenIncoming />} />
            <Route path="prep" element={<PrepBoard />} />
            <Route path="completed" element={<KitchenCompleted />} />
            <Route path="profile" element={<KitchenProfile />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
