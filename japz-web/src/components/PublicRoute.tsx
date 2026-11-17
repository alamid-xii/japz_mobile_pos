import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { loginDestination } from '../utils/stations';

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
        const previousPath = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
        const destination = user.role === 'admin' && previousPath?.startsWith('/admin/') ? previousPath : loginDestination(user);
        return <Navigate to={destination} replace />;
    }

    // Not logged in - show the public page
    return <>{children}</>;
}
