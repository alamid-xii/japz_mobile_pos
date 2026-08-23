import axios from 'axios';

// For local dev, point to local backend; for production use Railway
// Replace localhost with network IP for mobile device access
const getBaseUrl = () => {
    const envUrl = import.meta.env.VITE_API_URL;
    if (envUrl) return envUrl.replace(/\/$/, '');
    
    // Automatically detect hostname (works for localhost and network IP)
    const hostname = window.location.hostname;
    return `http://${hostname}:3000`;
};

const API_BASE_URL = getBaseUrl();

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
});

// Add token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const getApiBaseUrl = () => API_BASE_URL;

export const authAPI = {
    register: (name: string, email: string, password: string) =>
        api.post('/api/auth/register', { name, email, password }),

    // Send verification code to email before registration
    sendVerificationCode: (email: string, name: string) =>
        api.post('/api/auth/send-verification', { email, name }),

    // Verify code and complete registration
    verifyAndRegister: (data: { name: string; email: string; password: string; verificationCode: string }) =>
        api.post('/api/auth/verify-and-register', data),

    login: (email: string, password: string) =>
        api.post('/api/auth/login', { email, password }),

    logout: async () => {
        try {
            const response = await api.post('/api/auth/logout');
            localStorage.removeItem('authToken');
            return response;
        } catch (error) {
            localStorage.removeItem('authToken');
            throw error;
        }
    },

    getCurrentUser: () => api.get('/api/auth/user'),

    updateProfile: (data: {
        name: string;
        email: string;
        currentPassword?: string;
        newPassword?: string;
    }) => api.put('/api/auth/profile', data),

    forgotPassword: (email: string) =>
        api.post('/api/auth/forgot-password', { email }),

    resetPassword: (email: string, code: string, newPassword: string) =>
        api.post('/api/auth/reset-password', { email, code, newPassword }),
};

export const kitchenStationAPI = {
    getAll: () => api.get('/api/kitchen-stations'),
    create: (name: string, category: string, description?: string) =>
        api.post('/api/kitchen-stations', { name, category, description }),
};


export const usersAPI = {
    getPending: () => api.get('/api/users/pending'),
    getApproved: () => api.get('/api/users/approved'),
    approve: (id: number | string, role: string, assignedCategories?: number[]) =>
        api.put(`/api/users/${id}/approve`, { role, assignedCategories }),
    reject: (id: number | string) => api.put(`/api/users/${id}/reject`),
    toggleStatus: (id: number | string) => api.put(`/api/users/${id}/toggle-status`),
    updateRole: (id: number | string, role: string, assignedCategories?: number[]) =>
        api.put(`/api/users/${id}/role`, { role, assignedCategories }),
};

export const menuCategoryAPI = {
    getAll: () => api.get('/api/menu-categories'),
    create: (data: { name: string; description?: string; icon?: string }) =>
        api.post('/api/menu-categories', data),
    update: (id: string | number, data: { name?: string; description?: string; icon?: string; status?: 'active' | 'inactive' | 'available' | 'unavailable' }) =>
        api.put(`/api/menu-categories/${id}`, data),
    delete: (id: string | number) => api.delete(`/api/menu-categories/${id}`),
};

export const menuItemAPI = {
    getAll: () => api.get('/api/menu-items'),
    getAllAdmin: () => api.get('/api/menu-items/admin/all'),
    getByCategory: (categoryId: string | number) =>
        api.get(`/api/menu-items/category/${categoryId}`),
    create: (data: {
        name: string;
        categoryId: number;
        price: number;
        description?: string;
        hasSize?: boolean;
        sizes?: string[];
        hasFlavor?: boolean;
        flavors?: string[];
    }) => api.post('/api/menu-items', data),
    update: (id: string | number, data: any) => api.put(`/api/menu-items/${id}`, data),
    delete: (id: string | number) => api.delete(`/api/menu-items/${id}`),
};

export const stocksAPI = {
    setGeneralDefault: (defaultStock: number) => api.put('/api/stocks/set-general-default', { defaultStock }),
    restock: (id: number, quantity: number) => api.put(`/api/stocks/restock/${id}`, { quantity }),
    resetNow: () => api.post('/api/stocks/reset-now'),
};
export const ordersAPI = {
    create: (data: any) => api.post('/api/orders', data),
    getAll: (status?: string) => api.get('/api/orders', { params: { status } }),
    getById: (id: string | number) => api.get(`/api/orders/${id}`),
    updateStatus: (id: string | number, status: string) =>
        api.put(`/api/orders/${id}/status`, { status }),
    getIncomingByCategories: (data?: any) =>
        api.post('/api/kitchen/orders/incoming', data || {}),
    getCompletedByCategories: (data?: any) =>
        api.post('/api/kitchen/orders/completed', data || {}),
    updateOrderStatus: (id: string | number, status: string) =>
        api.put(`/api/orders/${id}/status`, { status }),
};

export const salesAPI = {
    getAnalytics: (period?: 'today' | 'week' | 'month' | 'year', startDate?: string, endDate?: string) =>
        api.get('/api/sales/analytics', { params: { period, startDate, endDate } }),
    getSummary: () => api.get('/api/sales/summary'),
    getDetailedReport: (startDate: string, endDate: string) =>
        api.get('/api/sales/detailed-report', { params: { startDate, endDate } }),
};

export const paymentsAPI = {
    create: (data: {
        orderId: number;
        method: 'cash' | 'card' | 'digital';
        amount: number;
        amountReceived?: number;
        change?: number;
    }) => api.post('/api/payments', data),
};

export const logsAPI = {
    getAll: (filters?: { userId?: number; action?: string; module?: string; limit?: number; offset?: number }) =>
        api.get('/api/logs', { params: filters }),
    getEntityLogs: (entityType: string, entityId: number) =>
        api.get(`/api/logs/entity/${entityType}/${entityId}`),
    getUserLogs: (userId: number) => api.get(`/api/logs/user/${userId}`),
};

export const feedbackAPI = {
    submit: (data: { orderNumber?: string; rating: number; comment?: string; tags?: string[]; googleFormResponseId?: string }) =>
        api.post('/api/feedback/submit', data),
    getAll: (status?: string, limit?: number, offset?: number) =>
        api.get('/api/feedback', { params: { status, limit, offset } }),
    getById: (id: string | number) => api.get(`/api/feedback/${id}`),
    update: (id: string | number, data: any) => api.put(`/api/feedback/${id}`, data),
    delete: (id: string | number) => api.delete(`/api/feedback/${id}`),
    getAnalytics: (startDate?: string, endDate?: string, limit?: number) =>
        api.get('/api/feedback/analytics', { params: { startDate, endDate, limit } }),
    export: (startDate: string, endDate: string) =>
        api.get('/api/feedback/export', { params: { startDate, endDate } }),
};

export const qrKeyAPI = {
    generate: () => api.post('/api/qr-key/generate'),
    getActive: () => api.get('/api/qr-key/active'),
    validate: (key: string) => api.get(`/api/qr-key/validate/${key}`),
};

export const discountsVouchersAPI = {
    // Discounts
    getDiscounts: () => api.get('/api/discounts'),
    createDiscount: (data: { name: string; percentage: number; enabled?: boolean }) =>
        api.post('/api/discounts', data),
    updateDiscount: (id: number | string, data: { name?: string; percentage?: number; enabled?: boolean }) =>
        api.put(`/api/discounts/${id}`, data),
    deleteDiscount: (id: number | string) => api.delete(`/api/discounts/${id}`),
    
    // Vouchers
    getVouchers: () => api.get('/api/vouchers'),
    createVoucher: (data: { name: string; amount: number; startDate?: string; endDate?: string; enabled?: boolean; quantity?: number }) =>
        api.post('/api/vouchers', data),
    updateVoucher: (id: number | string, data: { name?: string; code?: string; amount?: number; startDate?: string; endDate?: string; enabled?: boolean }) =>
        api.put(`/api/vouchers/${id}`, data),
    deleteVoucher: (id: number | string) => api.delete(`/api/vouchers/${id}`),
    redeemVoucher: (code: string) => api.post('/api/vouchers/redeem', { code }),
};

export const businessHoursAPI = {
    get: () => api.get('/api/business-hours'),
    update: (data: { openTime: string; closeTime: string; applyCashier: boolean; applyKitchen: boolean }) =>
        api.put('/api/business-hours', data),
};

export default api;
