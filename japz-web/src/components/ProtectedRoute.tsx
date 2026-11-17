import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useShift } from '../contexts/ShiftContext';
import { needsClockIn } from '../utils/stations';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles: ('admin' | 'cashier' | 'kitchen' | 'rider' | 'inventory')[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
    const { user, isInitialized } = useAuth();
    const shift = useShift();
    const location = useLocation();

    // Show loading while checking auth
    if (!isInitialized) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
            </div>
        );
    }

    // Not logged in - redirect to login
    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Logged in but wrong role - redirect to their correct dashboard
    if (!allowedRoles.includes(user.role)) {
        const roleRedirects: Record<string, string> = {
            admin: '/admin/dashboard',
            cashier: '/cashier/pos',
            kitchen: '/kitchen/incoming',
            rider: '/rider/deliveries',
            inventory: '/inventory/overview',
        };
        return <Navigate to={roleRedirects[user.role]} replace />;
    }

    // A direct URL or a restored session must pass the same attendance gate.
    if (needsClockIn(user) && location.pathname !== '/attendance') {
        if (shift.loading) {
            return <div className="spinner" role="status" aria-label="Checking your shift" />;
        }
        if (shift.error || !shift.onDuty) {
            return <Navigate to="/attendance" replace />;
        }
    }

    // User is authenticated and has correct role
    return <>{children}</>;
}
