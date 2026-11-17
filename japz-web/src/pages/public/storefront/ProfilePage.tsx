import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, LogOut, Receipt, ChevronRight, Save, UserCircle2 } from 'lucide-react';
import { customerAuthAPI } from '../../../services/api';
import { useCustomerAuth } from './CustomerAuthContext';
import { useStorefrontBase } from './storefrontRouting';
import EmptyState from './components/EmptyState';

interface PastOrder {
    orderNumber: string;
    status: string;
    orderType: string | null;
    total: string | number;
    placedAt: string;
    itemCount: number;
    preview: string[];
}

const money = (n: number | string) => `₱${Number(n).toFixed(2)}`;

const STATUS_STYLE: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    preparing: 'bg-blue-100 text-blue-700',
    ready: 'bg-green-100 text-green-700',
    completed: 'bg-gray-100 text-gray-600',
    cancelled: 'bg-red-100 text-red-700',
};

export default function ProfilePage() {
    const navigate = useNavigate();
    const base = useStorefrontBase();
    const { customer, ready, signOut, updateProfile } = useCustomerAuth();

    const [orders, setOrders] = useState<PastOrder[]>([]);
    const [tab, setTab] = useState<'orders' | 'account'>('orders');

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

    useEffect(() => {
        if (customer) { setName(customer.name); setPhone(customer.phone); }
    }, [customer]);

    useEffect(() => {
        if (!customer) return;
        customerAuthAPI.myOrders()
            .then(res => setOrders(res.data.orders || []))
            .catch(() => { /* history is non-critical */ });
    }, [customer]);

    if (!ready) {
        return (
            <div className="py-20 text-center">
                <div className="w-10 h-10 border-4 border-brand/30 border-t-brand rounded-full animate-spin mx-auto" />
            </div>
        );
    }

    if (!customer) {
        return (
            <EmptyState
                icon={UserCircle2}
                title="You're not signed in"
                body="Sign in to see your profile, order history and updates."
                actionLabel="SIGN IN"
                onAction={() => navigate(`${base}/auth`, { state: { from: `${base}/profile` } })}
            />
        );
    }

    const save = async () => {
        setMsg(null);
        setSaving(true);
        try {
            await updateProfile({
                name,
                phone,
                ...(newPassword ? { currentPassword, newPassword } : {}),
            });
            setCurrentPassword('');
            setNewPassword('');
            setMsg({ ok: true, text: 'Saved.' });
        } catch (err: any) {
            setMsg({ ok: false, text: err.message });
        } finally {
            setSaving(false);
        }
    };

    const field = 'w-full rounded-2xl bg-gray-50 text-gray-900 placeholder-gray-400 border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition duration-150';

    return (
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
            {/* Identity header */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                <span className="w-14 h-14 rounded-full bg-brand flex items-center justify-center shrink-0">
                    <User size={24} className="text-gray-900" />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="font-extrabold text-gray-900 truncate">{customer.name}</p>
                    <p className="text-xs text-gray-500 truncate">{customer.email}</p>
                    {customer.phone && <p className="text-xs text-gray-400">{customer.phone}</p>}
                </div>
                <button
                    onClick={() => { signOut(); navigate(base); }}
                    className="shrink-0 flex items-center gap-1 text-xs font-bold text-gray-500 border border-gray-200 rounded-full px-3 py-2 active:scale-95 transition duration-150"
                >
                    <LogOut size={14} /> Sign out
                </button>
            </section>

            {/* Tabs */}
            <div className="flex gap-2">
                {(['orders', 'account'] as const).map(t => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`flex-1 py-2.5 rounded-full text-sm font-bold transition duration-150 ${
                            tab === t ? 'bg-brand text-gray-900 shadow-sm' : 'bg-white text-gray-500 border border-gray-200'
                        }`}
                    >
                        {t === 'orders' ? 'My Orders' : 'Account'}
                    </button>
                ))}
            </div>

            {tab === 'orders' ? (
                orders.length === 0 ? (
                    <EmptyState
                        icon={Receipt}
                        title="No orders yet"
                        body="Your past orders will appear here."
                        actionLabel="BROWSE MENU"
                        onAction={() => navigate(`${base}/menu`)}
                    />
                ) : (
                    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100">
                        {orders.map(o => (
                            <button
                                key={o.orderNumber}
                                onClick={() => navigate(`${base}/track/${o.orderNumber}`)}
                                className="w-full flex items-center gap-3 p-4 text-left active:bg-gray-50 transition duration-150"
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold text-gray-900 text-sm">{o.orderNumber}</p>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLE[o.status] || 'bg-gray-100 text-gray-600'}`}>
                                            {o.status}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 truncate mt-0.5">
                                        {o.preview.join(', ')}{o.itemCount > o.preview.length ? '…' : ''}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        {new Date(o.placedAt).toLocaleString()}
                                    </p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="font-extrabold text-gray-900">{money(o.total)}</p>
                                    <span className="text-[11px] text-gray-400 flex items-center justify-end">
                                        Track <ChevronRight size={13} />
                                    </span>
                                </div>
                            </button>
                        ))}
                    </section>
                )
            ) : (
                <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                    <label className="block">
                        <span className="text-xs font-bold text-gray-500">Name</span>
                        <input value={name} onChange={e => setName(e.target.value)} className={field + ' mt-1'} />
                    </label>
                    <label className="block">
                        <span className="text-xs font-bold text-gray-500">Contact number</span>
                        <input value={phone} onChange={e => setPhone(e.target.value)} inputMode="tel" className={field + ' mt-1'} />
                    </label>
                    <label className="block">
                        <span className="text-xs font-bold text-gray-500">Email</span>
                        {/* Read-only: it is the login identity and there is no
                            verification step to prove a new address. */}
                        <input value={customer.email} readOnly disabled className={field + ' mt-1 opacity-60 cursor-not-allowed'} />
                    </label>

                    <div className="pt-2 border-t border-gray-100">
                        <p className="text-xs font-bold text-gray-500 mb-2">Change password (optional)</p>
                        <input value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} type="password"
                            className={field} placeholder="Current password" autoComplete="current-password" />
                        <input value={newPassword} onChange={e => setNewPassword(e.target.value)} type="password"
                            className={field + ' mt-2'} placeholder="New password (min 8 characters)" autoComplete="new-password" />
                    </div>

                    {msg && (
                        <div className={`rounded-2xl px-4 py-3 text-sm border ${
                            msg.ok ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
                        }`}>
                            {msg.text}
                        </div>
                    )}

                    <button
                        onClick={save}
                        disabled={saving}
                        className="w-full bg-brand text-gray-900 font-extrabold rounded-full py-3.5 shadow-sm disabled:opacity-50 active:scale-[0.99] transition duration-150 flex items-center justify-center gap-2"
                    >
                        <Save size={16} /> {saving ? 'Saving…' : 'Save changes'}
                    </button>
                </section>
            )}
        </div>
    );
}
