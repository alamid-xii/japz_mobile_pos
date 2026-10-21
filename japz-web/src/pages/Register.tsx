import { Link } from 'react-router-dom';
import Form from '../components/Form';
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Clock, ArrowLeft, RefreshCw } from 'lucide-react';
import { authAPI } from '../services/api';

type SignupPhase = 'credentials' | 'verification' | 'pending';

export default function Register() {
    const navigate = useNavigate();
    const [phase, setPhase] = useState<SignupPhase>('credentials');
    const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);

    // Verification code state
    const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
    const [resendCooldown, setResendCooldown] = useState(0);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Resend cooldown timer
    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendCooldown]);

    const update = (key: string, value: string) => setFormData(prev => ({ ...prev, [key]: value }));

    const inputCls = "w-full px-3.5 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition";

    // Phase 1: Submit credentials and send verification code
    const handleCredentialsSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: Record<string, string> = {};
        if (!formData.name.trim()) newErrors.name = 'Name is required';
        if (!formData.email.trim()) newErrors.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';
        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 12) {
            newErrors.password = 'Password must be at least 12 characters';
        } else if (!/[A-Z]/.test(formData.password)) {
            newErrors.password = 'Password must contain at least one uppercase letter';
        } else if (!/[0-9]/.test(formData.password)) {
            newErrors.password = 'Password must contain at least one number';
        }
        if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) return;

        setLoading(true);
        try {
            // Send verification code to email
            await authAPI.sendVerificationCode(formData.email, formData.name);
            setPhase('verification');
            setResendCooldown(60);
            setErrors({});
        } catch (err: any) {
            setErrors({ form: err.response?.data?.error || 'Failed to send verification code' });
        } finally {
            setLoading(false);
        }
    };

    // Handle verification code input
    const handleCodeChange = (index: number, value: string) => {
        if (value.length > 1) {
            // Handle paste
            const chars = value.slice(0, 6).split('');
            const newCode = [...verificationCode];
            chars.forEach((char, i) => {
                if (index + i < 6) newCode[index + i] = char;
            });
            setVerificationCode(newCode);
            const nextIndex = Math.min(index + chars.length, 5);
            inputRefs.current[nextIndex]?.focus();
        } else {
            const newCode = [...verificationCode];
            newCode[index] = value;
            setVerificationCode(newCode);
            if (value && index < 5) {
                inputRefs.current[index + 1]?.focus();
            }
        }
    };

    const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    // Phase 2: Verify code and complete registration
    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        const code = verificationCode.join('');
        if (code.length !== 6) {
            setErrors({ code: 'Please enter the complete 6-digit code' });
            return;
        }

        setLoading(true);
        try {
            // Verify code and register user
            await authAPI.verifyAndRegister({
                name: formData.name,
                email: formData.email,
                password: formData.password,
                verificationCode: code
            });
            setPhase('pending');
            setErrors({});
        } catch (err: any) {
            setErrors({ code: err.response?.data?.error || 'Invalid verification code' });
        } finally {
            setLoading(false);
        }
    };

    // Resend verification code
    const handleResendCode = async () => {
        if (resendCooldown > 0) return;
        setLoading(true);
        try {
            await authAPI.sendVerificationCode(formData.email, formData.name);
            setResendCooldown(60);
            setVerificationCode(['', '', '', '', '', '']);
            setErrors({});
        } catch (err: any) {
            setErrors({ code: err.response?.data?.error || 'Failed to resend code' });
        } finally {
            setLoading(false);
        }
    };

    // Phase 3: Pending approval screen
    if (phase === 'pending') {
        return (
            <div className="auth-shell">
                <div className="auth-panel">
                    <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                        <Clock size={40} className="text-amber-600" />
                    </div>
                    <h1 className="text-xl font-bold text-center mb-2 text-gray-900">Awaiting Admin Approval</h1>
                    <p className="text-sm text-center text-gray-500 mb-4 leading-relaxed">
                        Your email has been verified successfully!
                    </p>
                    <div className="w-full bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                        <div className="flex items-start gap-3">
                            <Mail size={20} className="text-amber-600 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-medium text-amber-800 mb-1">What happens next?</p>
                                <ul className="text-xs text-amber-700 space-y-1.5">
                                    <li>• An administrator will review your registration</li>
                                    <li>• You will receive an email notification once approved</li>
                                    <li>• If rejected, you'll also be notified via email</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div className="w-full bg-gray-50 rounded-xl p-4 mb-6">
                        <p className="text-xs text-center text-gray-500">
                            Registered email: <span className="font-medium text-gray-700">{formData.email}</span>
                        </p>
                    </div>
                    <button
                        className="w-full py-3 rounded-lg bg-brand font-semibold text-brand-dark text-[15px] hover:bg-yellow-400 active:bg-yellow-500 transition-all"
                        onClick={() => navigate('/login')}
                    >
                        Go to Login
                    </button>
                    <p className="text-xs text-center text-gray-400 mt-4">
                        Please check your email (including spam folder) for updates
                    </p>
                </div>
            </div>
        );
    }

    // Phase 2: Email verification
    if (phase === 'verification') {
        return (
            <div className="auth-shell">
                <div className="auth-panel">
                    <button
                        onClick={() => setPhase('credentials')}
                        className="self-start flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4 transition"
                    >
                        <ArrowLeft size={16} />
                        Back
                    </button>

                    <div className="w-16 h-16 rounded-full bg-brand/20 flex items-center justify-center mb-4">
                        <Mail size={32} className="text-brand-dark" />
                    </div>
                    <h1 className="text-xl font-bold text-center mb-2 text-gray-900">Verify Your Email</h1>
                    <p className="text-sm text-center text-gray-500 mb-1">
                        We've sent a 6-digit verification code to
                    </p>
                    <p className="text-sm text-center font-medium text-gray-700 mb-6">
                        {formData.email}
                    </p>

                    {errors.code && (
                        <div className="w-full bg-red-100 px-4 py-3 rounded-lg mb-4">
                            <p className="text-red-600 text-sm text-center">{errors.code}</p>
                        </div>
                    )}

                    <Form noValidate onSubmit={handleVerifyCode} className="w-full">
                        <div className="flex justify-center gap-2 mb-6">
                            {verificationCode.map((digit, index) => (
                                <input
                                    key={index}
                                    aria-label={`Verification digit ${index + 1}`} autoComplete={index === 0 ? "one-time-code" : "off"}
                                    ref={(el) => { inputRefs.current[index] = el; }}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={6}
                                    value={digit}
                                    onChange={(e) => handleCodeChange(index, e.target.value.replace(/\D/g, ''))}
                                    onKeyDown={(e) => handleCodeKeyDown(index, e)}
                                    className="w-11 h-14 text-center text-xl font-bold border-2 border-gray-200 rounded-lg bg-gray-50 outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition"
                                />
                            ))}
                        </div>

                        <button
                            type="submit"
                            disabled={loading || verificationCode.join('').length !== 6}
                            className="w-full py-3 rounded-lg bg-brand font-semibold text-brand-dark text-[15px] hover:bg-yellow-400 active:bg-yellow-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Verifying...' : 'Verify Email'}
                        </button>
                    </Form>

                    <div className="flex items-center justify-center gap-2 mt-4">
                        <span className="text-sm text-gray-500">Didn't receive the code?</span>
                        <button
                            onClick={handleResendCode}
                            disabled={resendCooldown > 0 || loading}
                            className="text-sm font-medium text-yellow-700 hover:text-yellow-800 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend'}
                        </button>
                    </div>

                    <p className="text-xs text-center text-gray-400 mt-4">
                        Check your spam folder if you don't see the email
                    </p>
                </div>
            </div>
        );
    }

    // Phase 1: Credentials form
    return (
        <div className="auth-shell">
            <div className="auth-panel">
                <img src="/logo.jpg" alt="JAPZ POS" className="auth-logo" />
                <h1 className="text-lg font-bold text-center mb-1 text-gray-900 md:text-2xl">Create Your Account</h1>
                <p className="text-xs text-center text-gray-500 mb-3 md:text-sm md:mb-6">Get started with JAPZ POS</p>

                {/* Progress indicator */}
                <div className="w-full flex items-center justify-center gap-2 mb-4">
                    <div className="flex items-center gap-1">
                        <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-brand-dark font-bold text-sm">1</div>
                        <span className="text-xs font-medium text-gray-700 hidden sm:inline">Credentials</span>
                    </div>
                    <div className="w-8 h-0.5 bg-gray-200"></div>
                    <div className="flex items-center gap-1">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 font-bold text-sm">2</div>
                        <span className="text-xs text-gray-400 hidden sm:inline">Verify</span>
                    </div>
                    <div className="w-8 h-0.5 bg-gray-200"></div>
                    <div className="flex items-center gap-1">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 font-bold text-sm">3</div>
                        <span className="text-xs text-gray-400 hidden sm:inline">Approval</span>
                    </div>
                </div>

                {errors.form && (
                    <div className="w-full bg-red-100 px-4 py-3 rounded-lg mb-2">
                        <p className="text-red-600 text-sm">{errors.form}</p>
                    </div>
                )}

                <Form noValidate className="w-full flex flex-col gap-2.5" onSubmit={handleCredentialsSubmit}>
                    <div className="flex flex-col gap-1">
                        <label htmlFor="register-field-1" className="text-[13px] font-medium text-gray-900">Full Name</label>
                        <input id="register-field-1" type="text" autoComplete="name" placeholder="Enter your full name" value={formData.name}
                            onChange={(e) => update('name', e.target.value)}
                            className={`${inputCls} ${errors.name ? 'border-red-500' : ''}`} />
                        {errors.name && <span className="text-xs text-red-500">{errors.name}</span>}
                    </div>

                    <div className="flex flex-col gap-1">
                        <label htmlFor="register-field-2" className="text-[13px] font-medium text-gray-900">Email Address</label>
                        <input id="register-field-2" type="email" placeholder="Enter your email" value={formData.email}
                            onChange={(e) => update('email', e.target.value)} autoComplete="email" required
                            className={`${inputCls} ${errors.email ? 'border-red-500' : ''}`} />
                        {errors.email && <span className="text-xs text-red-500">{errors.email}</span>}
                    </div>

                    <div className="flex flex-col gap-1">
                        <label htmlFor="register-field-3" className="text-[13px] font-medium text-gray-900">Password</label>
                        <div className="relative flex items-center">
                            <input id="register-field-3" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Enter password" value={formData.password}
                                onChange={(e) => update('password', e.target.value)}
                                className={`${inputCls} pr-10 ${errors.password ? 'border-red-500' : ''}`} />
                            <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 bg-transparent border-none cursor-pointer text-gray-400 flex items-center p-1">
                                {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                            </button>
                        </div>
                        {errors.password && <span className="text-xs text-red-500">{errors.password}</span>}
                        {/* Password requirements checklist */}
                        <div className="flex flex-wrap gap-2 mt-1">
                            <span className={`text-[11px] px-2 py-0.5 rounded-full ${formData.password.length >= 12 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                {formData.password.length >= 12 ? '✓' : '○'} 12+ characters
                            </span>
                            <span className={`text-[11px] px-2 py-0.5 rounded-full ${/[A-Z]/.test(formData.password) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                {/[A-Z]/.test(formData.password) ? '✓' : '○'} Uppercase
                            </span>
                            <span className={`text-[11px] px-2 py-0.5 rounded-full ${/[0-9]/.test(formData.password) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                {/[0-9]/.test(formData.password) ? '✓' : '○'} Number
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label htmlFor="register-field-4" className="text-[13px] font-medium text-gray-900">Confirm Password</label>
                        <div className="relative flex items-center">
                            <input id="register-field-4" type={showConfirm ? 'text' : 'password'} autoComplete="new-password" placeholder="Confirm password" value={formData.confirmPassword}
                                onChange={(e) => update('confirmPassword', e.target.value)}
                                className={`${inputCls} pr-10 ${errors.confirmPassword ? 'border-red-500' : ''}`} />
                            <button type="button" aria-label={showConfirm ? 'Hide confirmation password' : 'Show confirmation password'} aria-pressed={showConfirm} onClick={() => setShowConfirm(!showConfirm)}
                                className="absolute right-3 bg-transparent border-none cursor-pointer text-gray-400 flex items-center p-1">
                                {showConfirm ? <Eye size={18} /> : <EyeOff size={18} />}
                            </button>
                        </div>
                        {errors.confirmPassword && <span className="text-xs text-red-500">{errors.confirmPassword}</span>}
                    </div>

                    <button type="submit" disabled={loading}
                        className="w-full py-3 mt-1 rounded-lg bg-brand font-semibold text-brand-dark text-[15px] hover:bg-yellow-400 active:bg-yellow-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed">
                        {loading ? 'Sending Verification Code...' : 'Continue'}
                    </button>
                </Form>

                <p className="text-sm text-center text-gray-500 mt-3">
                    Already have an account? <Link className="text-yellow-700 underline cursor-pointer" to="/login">Login</Link>
                </p>
            </div>
        </div>
    );
}
