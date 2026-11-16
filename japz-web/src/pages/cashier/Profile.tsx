import { useFeedback } from '../../components/FeedbackProvider';
import { useNavigate } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';
import TimeClock from '../../components/TimeClock';
import { useAuth } from '../../hooks/useAuth';

export default function Profile() {
    const { confirmAction } = useFeedback();
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        if (!await confirmAction('Are you sure you want to logout?')) return;
        try { await logout(); } catch (e) { console.error(e); }
        navigate('/login', { replace: true });
    };

    return (
        <div className="app-page">
            <div className="max-w-2xl mx-auto">
                <div className="mb-6"><TimeClock /></div>
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-xl md:text-2xl font-bold">Profile</h1>
                    <button onClick={handleLogout}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-50 text-red-500 text-sm font-medium border-none cursor-pointer hover:bg-red-100 transition font-[inherit]">
                        <LogOut size={18} /> Logout
                    </button>
                </div>

                {/* Profile Card */}
                <div className="bg-white border border-gray-200 rounded-lg p-6 flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-brand flex items-center justify-center mb-5">
                        <User size={48} className="text-brand-dark" />
                    </div>
                    <h2 className="text-xl md:text-2xl font-bold">{user?.name || 'User'}</h2>
                    <p className="text-base text-gray-500 mt-2">{user?.email || 'user@example.com'}</p>
                    <span className="mt-3 px-4 py-1.5 rounded-full bg-blue-100 text-blue-700 text-sm font-medium capitalize">
                        {user?.role || 'cashier'}
                    </span>
                </div>
            </div>
        </div>
    );
}
