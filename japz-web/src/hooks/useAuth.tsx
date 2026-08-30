import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authAPI } from '../services/api';

export interface User {
    id: number;
    name: string;
    email: string;
    role: 'admin' | 'cashier' | 'kitchen' | 'rider';
    token?: string;
    assignedCategories?: number[];
}

interface AuthContextType {
    user: User | null;
    login: (email: string, password: string) => Promise<User | null>;
    register: (name: string, email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    setUser: (user: User | null) => void;
    loading: boolean;
    error: string | null;
    isInitialized: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        const initializeAuth = async () => {
            try {
                const token = localStorage.getItem('authToken');
                if (token) {
                    const response = await authAPI.getCurrentUser();
                    setUser(response.data.user);
                }
            } catch {
                console.log('No valid token found');
                localStorage.removeItem('authToken');
            } finally {
                setIsInitialized(true);
            }
        };
        initializeAuth();
    }, []);

    const login = async (email: string, password: string): Promise<User | null> => {
        setLoading(true);
        setError(null);
        try {
            const response = await authAPI.login(email, password);
            const { token, user: userData } = response.data;
            localStorage.setItem('authToken', token);
            const userWithToken = { ...userData, token };
            setUser(userWithToken);
            return userWithToken;
        } catch (err: any) {
            const errorMessage = err.response?.data?.error || 'Login failed';
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const register = async (name: string, email: string, password: string) => {
        setLoading(true);
        setError(null);
        try {
            await authAPI.register(name, email, password);
        } catch (err: any) {
            const errorMessage = err.response?.data?.error || 'Registration failed';
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        setLoading(true);
        try {
            try { await authAPI.logout(); } catch { /* continue */ }
            setUser(null);
            localStorage.removeItem('authToken');
        } catch {
            setUser(null);
            localStorage.removeItem('authToken');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, setUser, loading, error, isInitialized }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
}
