import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft, MailCheck } from 'lucide-react';
import { useCustomerAuth } from './CustomerAuthContext';
import { useStorefrontBase } from './StorefrontLayout';

type Mode = 'signin' | 'signup';
type SignupStep = 'details' | 'otp';

export default function AuthPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const base = useStorefrontBase();
    const { signIn, sendOtp, signUp } = useCustomerAuth();

    const next = (location.state as { from?: string } | null)?.from || `${base}/cart`;

    const [mode, setMode] = useState<Mode>('signin');
    const [step, setStep] = useState<SignupStep>('details');

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [code, setCode] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    // Resend cooldown, mirroring the server's one-minute gate so the button
    // does not invite a request that will be refused.
    const [cooldown, setCooldown] = useState(0);
    useEffect(() => {
        if (cooldown <= 0) return;
        const id = setInterval(() => setCooldown(c => Math.max(0, c - 1)), 1000);
        return () => clearInterval(id);
    }, [cooldown]);

    const requestCode = async (resend = false) => {
        setError(null);
        setNotice(null);
        setBusy(true);
        try {
            await sendOtp({ name: name.trim(), email: email.trim(), phone: phone.trim() });
            setStep('otp');
            setCooldown(60);
            setNotice(resend ? 'A new code is on its way.' : `We emailed a 6-digit code to ${email.trim()}.`);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    };

    const submit = async () => {
        setError(null);
        setBusy(true);
        try {
            if (mode === 'signin') {
                await signIn(email.trim(), password);
            } else {
                await signUp({
                    name: name.trim(),
                    email: email.trim(),
                    phone: phone.trim(),
                    password,
                    verificationCode: code.trim(),
                });
            }
            navigate(next, { replace: true });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    };

    const switchMode = () => {
        setMode(m => (m === 'signin' ? 'signup' : 'signin'));
        setStep('details');
        setError(null);
        setNotice(null);
        setCode('');
    };

    const field = 'w-full rounded-2xl bg-gray-50 text-slate-900 placeholder-slate-400 border border-gray-200 px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition duration-150';

    // ---------- Step 2: code entry ----------
    if (mode === 'signup' && step === 'otp') {
        return (
            <div className="max-w-md mx-auto px-4 py-6">
                <button onClick={() => { setStep('details'); setError(null); }} className="flex items-center gap-1 text-sm text-slate-500 mb-4 -ml-1">
                    <ArrowLeft size={16} /> Back
                </button>

                <div className="w-14 h-14 rounded-full bg-brand flex items-center justify-center mb-4">
                    <MailCheck size={26} className="text-slate-900" />
                </div>

                <h1 className="text-2xl font-extrabold text-slate-900">Check your email</h1>
                <p className="text-sm text-slate-500 mt-1 mb-5">
                    Enter the 6-digit code we sent to <span className="font-bold text-slate-900">{email.trim()}</span>. It expires in 10 minutes.
                </p>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                    <input
                        value={code}
                        onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="000000"
                        className={field + ' text-center text-2xl font-extrabold tracking-[0.4em]'}
                        onKeyDown={e => { if (e.key === 'Enter' && code.length === 6) submit(); }}
                    />

                    {notice && !error && (
                        <div className="bg-green-50 border border-green-200 text-green-700 rounded-2xl px-4 py-3 text-sm">{notice}</div>
                    )}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-sm">{error}</div>
                    )}

                    <button
                        onClick={submit}
                        disabled={busy || code.length !== 6}
                        className="w-full bg-brand text-slate-900 font-extrabold rounded-full py-4 shadow-sm disabled:opacity-50 active:scale-[0.99] transition duration-150"
                    >
                        {busy ? 'Verifying…' : 'Verify & create account'}
                    </button>

                    <button
                        onClick={() => requestCode(true)}
                        disabled={busy || cooldown > 0}
                        className="w-full text-sm font-bold text-slate-500 disabled:opacity-50 py-1"
                    >
                        {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
                    </button>
                </div>

                <p className="text-center text-[11px] text-slate-400 mt-5">
                    Wrong email? Go back and change it.
                </p>
            </div>
        );
    }

    // ---------- Sign in, or step 1 of sign up ----------
    return (
        <div className="max-w-md mx-auto px-4 py-6">
            <button onClick={() => navigate(base)} className="flex items-center gap-1 text-sm text-slate-500 mb-4 -ml-1">
                <ArrowLeft size={16} /> Back
            </button>

            <h1 className="text-2xl font-extrabold text-slate-900">
                {mode === 'signin' ? 'Welcome back' : 'Create your account'}
            </h1>
            <p className="text-sm text-slate-500 mt-1 mb-5">
                {mode === 'signin'
                    ? 'Sign in to place your order.'
                    : 'You need an account to order from JAPZ. We will email you a code to verify it.'}
            </p>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                {mode === 'signup' && (
                    <input value={name} onChange={e => setName(e.target.value)} className={field}
                        placeholder="Full name" autoComplete="name" />
                )}

                <input value={email} onChange={e => setEmail(e.target.value)} className={field}
                    placeholder="Email address" inputMode="email" autoComplete="email" />

                {mode === 'signup' && (
                    <input value={phone} onChange={e => setPhone(e.target.value)} className={field}
                        placeholder="Contact number" inputMode="tel" autoComplete="tel" />
                )}

                <div className="relative">
                    <input
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        type={showPw ? 'text' : 'password'}
                        className={field + ' pr-12'}
                        placeholder={mode === 'signup' ? 'Password (min 8 characters)' : 'Password'}
                        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                        onKeyDown={e => { if (e.key === 'Enter') (mode === 'signin' ? submit() : requestCode()); }}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPw(v => !v)}
                        aria-label={showPw ? 'Hide password' : 'Show password'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400"
                    >
                        {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-sm">{error}</div>
                )}

                <button
                    onClick={() => (mode === 'signin' ? submit() : requestCode())}
                    disabled={busy}
                    className="w-full bg-brand text-slate-900 font-extrabold rounded-full py-4 shadow-sm disabled:opacity-50 active:scale-[0.99] transition duration-150"
                >
                    {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Send verification code'}
                </button>
            </div>

            <p className="text-center text-sm text-slate-500 mt-5">
                {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
                <button onClick={switchMode} className="font-bold text-slate-900 underline underline-offset-4">
                    {mode === 'signin' ? 'Sign up' : 'Sign in'}
                </button>
            </p>

            <p className="text-center text-[11px] text-slate-400 mt-6">
                Staff sign in through the main app, not here.
            </p>
        </div>
    );
}
