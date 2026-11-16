import { useFeedback } from '../../components/FeedbackProvider';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, ChefHat, Mail, Tag } from 'lucide-react';
import TimeClock from '../../components/TimeClock';
import { useAuth } from '../../hooks/useAuth';
import { menuCategoryAPI } from '../../services/api';

interface Category {
    id: number;
    name: string;
}

export default function KitchenProfile() {
    const { confirmAction } = useFeedback();
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                setLoading(true);
                const res = await menuCategoryAPI.getAll();
                setCategories(res.data || []);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchCategories();
    }, []);

    const getAssignedCategoryNames = () => {
        if (!user?.assignedCategories || user.assignedCategories.length === 0) {
            return [];
        }
        return user.assignedCategories
            .map(categoryId => {
                const numericId = typeof categoryId === 'number' ? categoryId : parseInt(String(categoryId));
                const category = categories.find(cat => cat.id === numericId);
                return category?.name || `Category ${categoryId}`;
            })
            .filter(Boolean);
    };

    const handleLogout = async () => {
        if (!await confirmAction('Are you sure you want to logout?')) return;
        try {
            await logout();
        } catch (e) {
            console.error(e);
        }
        navigate('/login', { replace: true });
    };

    return (
        <div className="app-page">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Profile</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage your account settings</p>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-50 text-red-600 font-medium border border-red-200 hover:bg-red-100 transition cursor-pointer"
                >
                    <LogOut size={18} />
                    <span className="hidden md:inline">Logout</span>
                </button>
            </div>

            <div className="mb-6 max-w-md"><TimeClock /></div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Profile Card */}
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 h-24"></div>
                    <div className="px-6 pb-6 -mt-12">
                        <div className="w-24 h-24 rounded-full bg-brand border-4 border-white flex items-center justify-center mb-4 shadow-lg">
                            <User size={48} className="text-brand-dark" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800">{user?.name || 'Kitchen Staff'}</h2>
                        
                        <div className="mt-4 space-y-3">
                            <div className="flex items-center gap-3 text-gray-600">
                                <Mail size={18} className="text-gray-400" />
                                <span>{user?.email || 'kitchen@japz.com'}</span>
                            </div>
                            <div className="flex items-center gap-3 text-gray-600">
                                <ChefHat size={18} className="text-gray-400" />
                                <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-sm font-medium capitalize">
                                    {user?.role || 'kitchen'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Assigned Categories Card */}
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-yellow-100 p-2 rounded-lg">
                            <Tag size={20} className="text-yellow-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-800">Assigned Categories</h3>
                    </div>
                    
                    <p className="text-sm text-gray-500 mb-4">
                        You will receive orders from the following menu categories:
                    </p>

                    {loading ? (
                        <div className="flex justify-center py-4">
                            <div className="spinner" role="status" aria-label="Loading content" />
                        </div>
                    ) : user?.assignedCategories && user.assignedCategories.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {getAssignedCategoryNames().map((name, idx) => (
                                <span
                                    key={idx}
                                    className="px-4 py-2 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm font-medium flex items-center gap-2"
                                >
                                    <ChefHat size={14} />
                                    {name}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
                            <p>No categories assigned yet</p>
                            <p className="text-sm mt-1">Contact an admin to get assigned to menu categories</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
