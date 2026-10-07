import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Clock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { businessHoursAPI } from '../services/api';

export default function Login() {
    const navigate = useNavigate();
    const { login, loading, logout } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [businessHoursWarning, setBusinessHoursWarning] = useState('');

    const isWithinBusinessHours = (openTime: string, closeTime: string): boolean => {
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        // Compare times as strings (HH:MM format)
        return currentTime >= openTime && currentTime < closeTime;
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) { setError('Please enter both email and password'); return; }
        
        try {
            setBusinessHoursWarning('');
            setError('');
            
            // Attempt login
            const result = await login(email, password);
            setError('');
            
            // Double-check business hours for non-admin roles after login
            if (result?.role === 'cashier' || result?.role === 'kitchen') {
                try {
                    const hoursResponse = await businessHoursAPI.get();
                    const businessHours = hoursResponse.data;
                    
                    const openTime = businessHours.openTime?.substring(0, 5) || '09:00';
                    const closeTime = businessHours.closeTime?.substring(0, 5) || '22:00';
                    
                    const isOpen = isWithinBusinessHours(openTime, closeTime);
                    const shouldCheckHours = (result.role === 'cashier' && businessHours.applyCashier) || 
                                            (result.role === 'kitchen' && businessHours.applyKitchen);
                    
                    console.log('📅 Post-Login Business Hours Check:', {
                        role: result.role,
                        openTime,
                        closeTime,
                        isOpen,
                        shouldCheckHours
                    });
                    
                    if (!isOpen && shouldCheckHours) {
                        // Block access and clear authenticated session
                        try { await logout(); } catch {}
                        setBusinessHoursWarning('Access is restricted at this time. Please contact your manager or try again during operating hours.');
                        return;
                    }
                } catch (err) {
                    console.error('Error checking business hours:', err);
                }
            }
            
            // Navigate based on role
            if (result?.role === 'cashier') navigate('/cashier/pos', { replace: true });
            else if (result?.role === 'kitchen') navigate('/kitchen/incoming', { replace: true });
            else if (result?.role === 'inventory') navigate('/inventory/overview', { replace: true });
            else navigate('/admin/dashboard', { replace: true });
        } catch (err: any) { setError(err.message || 'Login failed'); }
    };

    return (
        <div className="flex flex-col items-center justify-center h-full px-4 py-6 bg-gradient-to-br from-yellow-50 via-yellow-100/50 to-white overflow-hidden">
            <div className="w-full max-w-[420px] flex flex-col items-center md:bg-white md:rounded-2xl md:shadow-lg md:px-10 md:py-10">
                <img src="/logo.jpg" alt="JAPZ POS" className="w-[72px] h-[72px] rounded-lg object-contain mb-2 md:w-[120px] md:h-[120px] md:mb-5" />
                <p className="text-xs text-center text-gray-500 mb-4 md:text-sm md:mb-7">Welcome back to JAPZ POS</p>

                {error && (
                    <div className="w-full bg-red-100 px-4 py-3 rounded-lg mb-2">
                        <p className="text-red-600 text-sm">{error}</p>
                    </div>
                )}

                {businessHoursWarning && (
                    <div className="w-full bg-orange-100 px-4 py-3 rounded-lg mb-2 flex items-start gap-3">
                        <Clock size={18} className="text-orange-600 flex-shrink-0 mt-0.5" />
                        <p className="text-orange-700 text-sm">{businessHoursWarning}</p>
                    </div>
                )}

                <form className="w-full flex flex-col gap-2.5" onSubmit={handleLogin}>
                    <div className="flex flex-col gap-1">
                        <label className="text-[13px] font-medium text-gray-900">Email</label>
                        <input type="email" placeholder="Enter your email" value={email}
                            onChange={(e) => setEmail(e.target.value)} autoComplete="email"
                            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition" />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-[13px] font-medium text-gray-900">Password</label>
                        <div className="relative flex items-center">
                            <input type={showPassword ? 'text' : 'password'} placeholder="Enter your password" value={password}
                                onChange={(e) => setPassword(e.target.value)} autoComplete="current-password"
                                className="w-full px-3.5 py-2.5 pr-10 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition" />
                            <button type="button" onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 bg-transparent border-none cursor-pointer text-gray-400 flex items-center p-1">
                                {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                            </button>
                        </div>
                    </div>

                    <button type="submit" disabled={loading}
                        className="w-full py-3 mt-1 rounded-lg bg-brand font-semibold text-brand-dark text-[15px] hover:shadow-md hover:shadow-yellow-300/40 active:scale-[0.97] transition-all disabled:opacity-60 disabled:cursor-not-allowed">
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                <div className="flex flex-col gap-3 mt-4 text-sm text-center text-gray-500 w-full">
                    <p>
                        <span className="text-yellow-700 underline cursor-pointer hover:text-yellow-800" onClick={() => navigate('/forgot-password')}>Forgot password?</span>
                    </p>
                    <p>
                        Don't have an account?{' '}
                        <span className="text-yellow-700 underline cursor-pointer hover:text-yellow-800" onClick={() => navigate('/register')}>Register here</span>
                    </p>
                </div>
            </div>
        </div>
    );
}
