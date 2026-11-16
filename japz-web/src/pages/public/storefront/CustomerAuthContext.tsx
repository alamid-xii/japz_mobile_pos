import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { customerAuthAPI, CUSTOMER_TOKEN_KEY } from '../../../services/api';

export interface CustomerUser {
    id: number;
    name: string;
    email: string;
    phone: string;
}

export interface Notification {
    orderNumber: string;
    status: string;
    title: string;
    body: string;
    at: string;
    unread: boolean;
}

interface Value {
    customer: CustomerUser | null;
    ready: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    sendOtp: (data: { name: string; email: string; phone: string }) => Promise<void>;
    signUp: (data: { name: string; email: string; phone: string; password: string; verificationCode: string }) => Promise<void>;
    signOut: () => void;
    updateProfile: (data: { name?: string; phone?: string; currentPassword?: string; newPassword?: string }) => Promise<void>;
    notifications: Notification[];
    unreadCount: number;
    refreshNotifications: () => Promise<void>;
    markNotificationsRead: () => Promise<void>;
}

const Ctx = createContext<Value | undefined>(undefined);

const readError = (err: any, fallback: string) =>
    new Error(err?.response?.data?.error || fallback);

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
    const [customer, setCustomer] = useState<CustomerUser | null>(null);
    const [ready, setReady] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const store = (token: string, user: CustomerUser) => {
        try { localStorage.setItem(CUSTOMER_TOKEN_KEY, token); } catch { /* private mode */ }
        setCustomer(user);
    };

    // Validate any stored token once on load. A stale or revoked token is
    // cleared rather than left to fail every subsequent request.
    useEffect(() => {
        (async () => {
            let token: string | null = null;
            try { token = localStorage.getItem(CUSTOMER_TOKEN_KEY); } catch { /* private mode */ }
            if (!token) { setReady(true); return; }
            try {
                const res = await customerAuthAPI.me();
                setCustomer(res.data.user);
            } catch {
                try { localStorage.removeItem(CUSTOMER_TOKEN_KEY); } catch { /* private mode */ }
            } finally {
                setReady(true);
            }
        })();
    }, []);

    const refreshNotifications = useCallback(async () => {
        if (!customer) { setNotifications([]); setUnreadCount(0); return; }
        try {
            const res = await customerAuthAPI.notifications();
            setNotifications(res.data.notifications || []);
            setUnreadCount(res.data.unreadCount || 0);
        } catch { /* non-critical */ }
    }, [customer]);

    // Poll on the same cadence the rest of the app uses for order state.
    useEffect(() => {
        if (!customer) return;
        refreshNotifications();
        const id = setInterval(refreshNotifications, 15000);
        return () => clearInterval(id);
    }, [customer, refreshNotifications]);

    const signIn = useCallback(async (email: string, password: string) => {
        try {
            const res = await customerAuthAPI.login(email, password);
            store(res.data.token, res.data.user);
        } catch (err) { throw readError(err, 'Could not sign in. Please try again.'); }
    }, []);

    const sendOtp = useCallback(async (data: { name: string; email: string; phone: string }) => {
        try {
            await customerAuthAPI.sendOtp(data);
        } catch (err) { throw readError(err, 'Could not send the code. Please try again.'); }
    }, []);

    const signUp = useCallback(async (data: { name: string; email: string; phone: string; password: string; verificationCode: string }) => {
        try {
            const res = await customerAuthAPI.register(data);
            store(res.data.token, res.data.user);
        } catch (err) { throw readError(err, 'Could not create your account. Please try again.'); }
    }, []);

    const signOut = useCallback(() => {
        try { localStorage.removeItem(CUSTOMER_TOKEN_KEY); } catch { /* private mode */ }
        setCustomer(null);
        setNotifications([]);
        setUnreadCount(0);
    }, []);

    const updateProfile = useCallback(async (data: { name?: string; phone?: string; currentPassword?: string; newPassword?: string }) => {
        try {
            const res = await customerAuthAPI.updateProfile(data);
            setCustomer(res.data.user);
        } catch (err) { throw readError(err, 'Could not save your changes.'); }
    }, []);

    const markNotificationsRead = useCallback(async () => {
        try {
            await customerAuthAPI.markRead();
            setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
            setUnreadCount(0);
        } catch { /* non-critical */ }
    }, []);

    return (
        <Ctx.Provider value={{
            customer, ready, signIn, sendOtp, signUp, signOut, updateProfile,
            notifications, unreadCount, refreshNotifications, markNotificationsRead,
        }}>
            {children}
        </Ctx.Provider>
    );
}

export function useCustomerAuth() {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error('useCustomerAuth must be used inside CustomerAuthProvider');
    return ctx;
}
