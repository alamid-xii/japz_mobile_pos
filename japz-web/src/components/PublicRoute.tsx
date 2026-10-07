import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface PublicRouteProps {
    children: React.ReactNode;
}

// Redirects authenticated users away from public pages (login, register, etc.)
export default function PublicRoute({ children }: PublicRouteProps) {
    const { user, isInitialized } = useAuth();
    const location = useLocation();

    // Show loading while checking auth
    if (!isInitialized) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
            </div>
        );
    }

    // If user is logged in, redirect to their dashboard
    if (user) {
        const roleRedirects = {
            admin: '/admin/dashboard',
            cashier: '/cashier/pos',
            kitchen: '/kitchen/incoming',
            inventory: '/inventory/overview',
        };
        const from = (location.state as any)?.from?.pathname || roleRedirects[user.role];
        return <Navigate to={from} replace />;
    }

    // Not logged in - show the public page
    return <>{children}</>;
}
