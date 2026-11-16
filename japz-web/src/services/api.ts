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

export const CUSTOMER_TOKEN_KEY = 'japz.customerToken';

// Two independent identities share this client: staff (POS/kitchen/admin) and
// storefront customers. They must never borrow each other's token, so the
// customer token is used only for /api/public/* and the staff token elsewhere.
api.interceptors.request.use((config) => {
    const isStorefront = (config.url || '').startsWith('/api/public/');
    const token = isStorefront
        ? localStorage.getItem(CUSTOMER_TOKEN_KEY)
        : localStorage.getItem('authToken');
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

    /** Uploads a photo for one item. Staff token only. */
    uploadImage: (id: string | number, file: File) => {
        const form = new FormData();
        form.append('image', file);
        return api.post(`/api/menu-items/${id}/image`, form, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 60000,
        });
    },
    removeImage: (id: string | number) => api.delete(`/api/menu-items/${id}/image`),
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

// ---- Kitchen → Cashier → Rider delivery workflow ----
export const workflowAPI = {
    kitchenOrders: () => api.get('/api/kitchen/orders'),
    setItemStatus: (itemId: number, status: 'pending' | 'preparing' | 'ready') =>
        api.put(`/api/kitchen/items/${itemId}/status`, { status }),

    readyOrders: () => api.get('/api/cashier/ready-orders'),
    availableRiders: () => api.get('/api/cashier/available-riders'),
    assignRider: (orderId: number, riderId: number) =>
        api.post(`/api/cashier/orders/${orderId}/assign-rider`, { riderId }),
    completeOrder: (orderId: number) =>
        api.post(`/api/cashier/orders/${orderId}/complete`),

    myDeliveries: () => api.get('/api/rider/deliveries'),
    startDelivery: (deliveryId: number) =>
        api.post(`/api/rider/deliveries/${deliveryId}/start`),
    /** Proof photo is mandatory; the server rejects the call without it. */
    markDelivered: (deliveryId: number, proof: File, coords?: { lat: number; lng: number }, notes?: string) => {
        const form = new FormData();
        form.append('proof', proof);
        if (coords) { form.append('lat', String(coords.lat)); form.append('lng', String(coords.lng)); }
        if (notes) form.append('notes', notes);
        return api.post(`/api/rider/deliveries/${deliveryId}/deliver`, form, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 60000,
        });
    },
    setRiderAvailability: (availability: 'available' | 'offline') =>
        api.put('/api/rider/availability', { availability }),

    receipt: (orderNumber: string) => api.get(`/api/receipts/${encodeURIComponent(orderNumber)}`),
    adminDeliveries: () => api.get('/api/admin/deliveries'),
    orderEvents: (orderId: number) => api.get(`/api/admin/orders/${orderId}/events`),
    riders: () => api.get('/api/admin/riders'),
    updateRider: (id: number, data: { name?: string; phone?: string; status?: string; availability?: string }) =>
        api.put(`/api/admin/riders/${id}`, data),
};

export const salesAPI = {
    getAnalytics: (period?: 'today' | 'week' | 'month' | 'year', startDate?: string, endDate?: string) =>
        api.get('/api/sales/analytics', { params: { period, startDate, endDate } }),
    getSummary: () => api.get('/api/sales/summary'),
    getDetailedReport: (startDate: string, endDate: string) =>
        api.get('/api/sales/detailed-report', { params: { startDate, endDate } }),
};

export interface PublicOrderLine {
    id: number;
    quantity: number;
    modifiers?: Record<string, string> | null;
}

export interface PublicOrderPayload {
    items: PublicOrderLine[];
    orderType: 'dine-in' | 'take-out' | 'delivery';
    customerName: string;
    customerPhone: string;
    tableNumber?: string;
    deliveryAddress?: string;
    deliveryLat?: number;
    deliveryLng?: number;
    deliveryAddressId?: number;
    saveAddress?: boolean;
    addressLabel?: string;
    notes?: string;
    paymentMethod?: string;
    paymentReference?: string;
}

export interface PaymentMethodOption {
    key: 'cash' | 'card' | 'gcash';
    label: string;
    hint: string;
    account?: string;
    accountName?: string | null;
}

export interface SavedAddress {
    id: number;
    label: string | null;
    address: string;
    lat: number | null;
    lng: number | null;
    isDefault: boolean;
    lastUsedAt: string | null;
}

// Customer-facing endpoints. No auth token is required or sent; prices and
// totals are computed by the server, so nothing here is trusted client-side.
export const customerAuthAPI = {
    sendOtp: (data: { name: string; email: string; phone: string }) =>
        api.post('/api/public/auth/send-otp', data),
    register: (data: { name: string; email: string; phone: string; password: string; verificationCode: string }) =>
        api.post('/api/public/auth/register', data),
    login: (email: string, password: string) =>
        api.post('/api/public/auth/login', { email, password }),
    me: () => api.get('/api/public/auth/me'),
    updateProfile: (data: { name?: string; phone?: string; currentPassword?: string; newPassword?: string }) =>
        api.put('/api/public/auth/profile', data),
    myOrders: () => api.get('/api/public/my-orders'),
    notifications: () => api.get('/api/public/notifications'),
    markRead: () => api.post('/api/public/notifications/read'),
    addresses: () => api.get('/api/public/addresses'),
    addAddress: (data: { label?: string; address: string; lat?: number | null; lng?: number | null; isDefault?: boolean }) =>
        api.post('/api/public/addresses', data),
    updateAddress: (id: number, data: Partial<{ label: string; address: string; lat: number | null; lng: number | null; isDefault: boolean }>) =>
        api.put(`/api/public/addresses/${id}`, data),
    deleteAddress: (id: number) => api.delete(`/api/public/addresses/${id}`),
};

export const publicOrderAPI = {
    getStatus: () => api.get('/api/public/status'),
    getPopular: () => api.get('/api/public/popular'),
    getPromos: () => api.get('/api/public/promos'),
    reverseGeocode: (lat: number, lng: number) =>
        api.get('/api/public/reverse-geocode', { params: { lat, lng } }),
    route: (fromLat: number, fromLng: number, toLat: number, toLng: number) =>
        api.get('/api/public/route', { params: { fromLat, fromLng, toLat, toLng } }),
    place: (payload: PublicOrderPayload) => api.post('/api/public/orders', payload),
    track: (orderNumber: string) => api.get(`/api/public/orders/${encodeURIComponent(orderNumber)}`),
    rateOrder: (orderNumber: string, rating: number, comment?: string) =>
        api.post(`/api/public/orders/${encodeURIComponent(orderNumber)}/feedback`, { rating, comment }),
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

// ===== PAYROLL =====
// Attendance is the staff's own record; everything else is admin-only and the
// server enforces that regardless of what the UI shows.
export const attendanceAPI = {
    me: () => api.get('/api/attendance/me'),
    clockIn: () => api.post('/api/attendance/clock-in'),
    clockOut: () => api.post('/api/attendance/clock-out'),
    myPayslips: () => api.get('/api/payroll/my-payslips'),
};

export const payrollAPI = {
    getSettings: () => api.get('/api/payroll/settings'),
    saveSettings: (data: Record<string, number>) => api.put('/api/payroll/settings', data),

    staff: () => api.get('/api/payroll/staff'),
    setRate: (userId: number, payType: 'hourly' | 'monthly', payRate: number) =>
        api.put(`/api/payroll/staff/${userId}/rate`, { payType, payRate }),

    attendance: (params?: { from?: string; to?: string; userId?: number }) =>
        api.get('/api/payroll/attendance', { params }),
    closeShift: (logId: number, clockOutAt?: string) =>
        api.put(`/api/payroll/attendance/${logId}/close`, { clockOutAt }),

    periods: () => api.get('/api/payroll/periods'),
    createPeriod: (data: { label: string; startDate: string; endDate: string }) =>
        api.post('/api/payroll/periods', data),
    period: (id: number) => api.get(`/api/payroll/periods/${id}`),
    generate: (id: number) => api.post(`/api/payroll/periods/${id}/generate`),
    finalize: (id: number) => api.post(`/api/payroll/periods/${id}/finalize`),
    deletePeriod: (id: number) => api.delete(`/api/payroll/periods/${id}`),
    updatePayslip: (id: number, data: { otherDeductionLabel?: string | null; otherDeductionAmount: number; notes?: string }) =>
        api.put(`/api/payroll/payslips/${id}`, data),
};

// ===== RESERVATIONS =====
export const reservationAPI = {
    list: (params?: { date?: string; status?: string }) => api.get('/api/reservations', { params }),
    create: (data: Record<string, unknown>) => api.post('/api/reservations', data),
    confirm: (id: number, tableId?: number, message?: string) =>
        api.put(`/api/reservations/${id}/confirm`, { tableId, message }),
    decline: (id: number, message?: string) => api.put(`/api/reservations/${id}/decline`, { message }),
    setStatus: (id: number, status: 'seated' | 'completed' | 'no-show' | 'cancelled', message?: string) =>
        api.put(`/api/reservations/${id}/status`, { status, message }),
    freeTables: (id: number) => api.get(`/api/reservations/${id}/free-tables`),
    /** Free tables for a slot that has no booking yet (walk-in entry). */
    freeTablesForSlot: (date: string, time: string, partySize: number, durationMinutes = 90) =>
        api.get('/api/reservations-free-tables', { params: { date, time, partySize, durationMinutes } }),

    tables: () => api.get('/api/reservations-tables'),
    createTable: (data: { name: string; capacity: number; area?: string }) =>
        api.post('/api/reservations-tables', data),
    updateTable: (id: number, data: Record<string, unknown>) =>
        api.put(`/api/reservations-tables/${id}`, data),
    deleteTable: (id: number) => api.delete(`/api/reservations-tables/${id}`),
};

/** Storefront side. Availability is open; booking needs a customer session. */
export const publicReservationAPI = {
    availability: (date: string, time: string, partySize: number, durationMinutes = 90) =>
        api.get('/api/public/reservations/availability', { params: { date, time, partySize, durationMinutes } }),
    book: (data: { reservationDate: string; startTime: string; partySize: number; durationMinutes?: number; customerPhone?: string; notes?: string }) =>
        api.post('/api/public/reservations', data),
    mine: () => api.get('/api/public/reservations/mine'),
    cancel: (code: string) => api.post(`/api/public/reservations/${encodeURIComponent(code)}/cancel`),
};

// ===== PAYMONGO =====
// Nothing here confirms a payment. Confirmation always comes from the server
// asking PayMongo, so a customer cannot mark their own order paid.
export const paymentAPI = {
    /** Whether card/GCash are actually live. Safe to call signed out. */
    config: () => api.get('/api/public/payments/config'),
    /** Returns the hosted checkout URL to send the customer to. */
    checkout: (orderNumber: string, method?: 'card' | 'gcash') =>
        api.post('/api/public/payments/checkout', { orderNumber, method }),
    status: (orderNumber: string) =>
        api.get(`/api/public/payments/status/${encodeURIComponent(orderNumber)}`),
    cancel: (orderNumber: string) =>
        api.post(`/api/public/payments/cancel/${encodeURIComponent(orderNumber)}`),
};

/** Counter payments: the cashier shows a QR, the customer pays on their phone. */
export const posPaymentAPI = {
    checkout: (orderNumber: string, method?: 'card' | 'gcash') =>
        api.post('/api/payments/pos/checkout', { orderNumber, method }),
    status: (orderNumber: string) =>
        api.get(`/api/payments/pos/status/${encodeURIComponent(orderNumber)}`),
    cancel: (orderNumber: string) =>
        api.post(`/api/payments/pos/cancel/${encodeURIComponent(orderNumber)}`),
    sessions: () => api.get('/api/payments/sessions'),
};

export default api;
