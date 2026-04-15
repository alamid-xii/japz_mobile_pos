import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { authAPI } from '../services/api';

export default function ForgotPassword() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            setError('Please enter your email address');
            return;
        }

        setLoading(true);
        setError('');
        try {
            await authAPI.forgotPassword(email);
            setSubmitted(true);
        } catch (err: any) {
            setError(err.response?.data?.error || err.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-full px-4 py-6 bg-gradient-to-br from-yellow-50 via-yellow-100/50 to-white overflow-hidden">
            <div className="w-full max-w-[420px] flex flex-col items-center md:bg-white md:rounded-2xl md:shadow-lg md:px-10 md:py-10">
                <button
                    onClick={() => navigate('/login')}
                    className="self-start mb-4 flex items-center gap-1 text-yellow-700 hover:text-yellow-800 text-sm font-medium"
                >
                    <ArrowLeft size={16} />
                    Back to Login
                </button>

                {!submitted ? (
                    <>
                        <img src="/logo.jpg" alt="JAPZ POS" className="w-[72px] h-[72px] rounded-lg object-contain mb-2 md:w-[120px] md:h-[120px] md:mb-5" />
                        <h1 className="text-xl font-bold text-gray-900 mb-1 md:text-2xl">Forgot Password?</h1>
                        <p className="text-xs text-center text-gray-500 mb-6 md:text-sm">Enter your email address and we'll send you a link to reset your password</p>

                        {error && (
                            <div className="w-full bg-red-100 px-4 py-3 rounded-lg mb-4">
                                <p className="text-red-600 text-sm">{error}</p>
                            </div>
                        )}

                        <form className="w-full flex flex-col gap-3" onSubmit={handleSubmit}>
                            <div className="flex flex-col gap-1">
                                <label className="text-[13px] font-medium text-gray-900">Email Address</label>
                                <input
                                    type="email"
                                    placeholder="Enter your email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 rounded-lg bg-brand font-semibold text-brand-dark text-[15px] hover:shadow-md hover:shadow-yellow-300/40 active:scale-[0.97] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Sending...' : 'Send Reset Link'}
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="text-center py-8 flex flex-col items-center gap-4 w-full">
                        <CheckCircle size={64} className="text-green-500" />
                        <h2 className="text-xl font-bold text-gray-900">Check Your Email</h2>
                        <p className="text-sm text-gray-600">
                            We've sent a reset code to <strong>{email}</strong>
                        </p>
                        <p className="text-xs text-gray-500">
                            The code will expire in 15 minutes. Please check your spam folder if you don't see it.
                        </p>
                        <button
                            onClick={() => navigate('/reset-password')}
                            className="mt-6 px-6 py-2 rounded-lg bg-brand font-semibold text-brand-dark text-sm hover:shadow-md hover:shadow-yellow-300/40 transition-all"
                        >
                            Enter Reset Code
                        </button>
                        <button
                            onClick={() => navigate('/login')}
                            className="mt-2 px-6 py-2 rounded-lg bg-gray-100 font-medium text-gray-700 text-sm hover:bg-gray-200 transition"
                        >
                            Back to Login
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
