import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import ReservationLayout from "./components/ReservationLayout";
import Home from "./pages/Home";
import Reserve from "./pages/Reserve";
import ManageReservation from "./pages/ManageReservation";
import ManagerLogin from "./pages/ManagerLogin";
import ReservationAdmin from "./pages/ReservationAdmin";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<ReservationLayout />}>
            <Route index element={<Home />} />
            <Route path="reserve" element={<Reserve />} />
            <Route path="manage" element={<ManageReservation />} />
            <Route path="login" element={<ManagerLogin />} />
            <Route path="forgot-password" element={<ForgotPassword />} />
            <Route path="reset-password" element={<ResetPassword />} />
            <Route path="admin/reservations" element={<ReservationAdmin />} />
            <Route
              path="admin"
              element={<Navigate to="/admin/reservations" replace />}
            />
            <Route
              path="admin/dashboard"
              element={<Navigate to="/admin/reservations" replace />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
