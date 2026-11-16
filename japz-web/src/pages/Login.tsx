import Form from '../components/Form';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Clock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
    const navigate = useNavigate();
    const { login, loading } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [businessHoursWarning, setBusinessHoursWarning] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) { setError('Please enter both email and password'); return; }
        
        try {
            setBusinessHoursWarning('');
            setError('');
            
            // Attempt login (business hours verified before session is stored)
            const result = await login(email, password);
            
            // Navigate based on role
            if (result?.role === 'cashier') navigate('/cashier/pos', { replace: true });
            else if (result?.role === 'kitchen') navigate('/kitchen/incoming', { replace: true });
            else if (result?.role === 'rider') navigate('/rider/deliveries', { replace: true });
            else if (result?.role === 'inventory') navigate('/inventory/overview', { replace: true });
            else navigate('/admin/dashboard', { replace: true });
        } catch (err: any) {
            if (err.message?.includes('Access is restricted')) {
                setBusinessHoursWarning(err.message);
            } else {
                setError(err.message || 'Login failed');
            }
        }
    };

    return (
        <div className="auth-shell">
            <div className="auth-panel">
                <img src="/logo.jpg" alt="JAPZ POS" className="auth-logo" />
                <h1 className="text-2xl font-semibold text-gray-900 mb-2">Login</h1>
                <p className="text-sm text-center text-gray-500 mb-6">Welcome back to JAPZ POS</p>

                {error && (
                    <div role="alert" className="w-full bg-red-100 px-4 py-3 rounded-lg mb-2">
                        <p className="text-red-600 text-sm">{error}</p>
                    </div>
                )}

                {businessHoursWarning && (
                    <div role="alert" className="w-full bg-orange-100 px-4 py-3 rounded-lg mb-2 flex items-start gap-3">
                        <Clock size={18} className="text-orange-600 flex-shrink-0 mt-0.5" />
                        <p className="text-orange-700 text-sm">{businessHoursWarning}</p>
                    </div>
                )}

                <Form noValidate className="w-full flex flex-col gap-2.5" onSubmit={handleLogin}>
                    <div className="flex flex-col gap-1">
                        <label htmlFor="login-field-1" className="text-[13px] font-medium text-gray-900">Email</label>
                        <input id="login-field-1" type="email" required placeholder="Enter your email" value={email}
                            onChange={(e) => setEmail(e.target.value)} autoComplete="email"
                            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition" />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label htmlFor="login-field-2" className="text-[13px] font-medium text-gray-900">Password</label>
                        <div className="relative flex items-center">
                            <input id="login-field-2" type={showPassword ? 'text' : 'password'} required placeholder="Enter your password" value={password}
                                onChange={(e) => setPassword(e.target.value)} autoComplete="current-password"
                                className="w-full px-3.5 py-2.5 pr-10 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition" />
                            <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 bg-transparent border-none cursor-pointer text-gray-400 flex items-center p-1">
                                {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                            </button>
                        </div>
                    </div>

                    <button type="submit" disabled={loading}
                        className="w-full py-3 mt-1 rounded-lg bg-brand font-semibold text-brand-dark text-[15px] hover:bg-yellow-400 active:bg-yellow-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed">
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </Form>

                <div className="flex flex-col gap-3 mt-4 text-sm text-center text-gray-500 w-full">
                    <p>
                        <Link className="text-yellow-700 underline hover:text-yellow-800" to="/forgot-password">Forgot password?</Link>
                    </p>
                    <p>
                        Don't have an account?{' '}
                        <Link className="text-yellow-700 underline hover:text-yellow-800" to="/register">Register here</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
