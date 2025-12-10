import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Default fallback IP (can be changed by user)
const DEFAULT_API_BASE_URL = 'http://10.82.31.96:3000';

let API_BASE_URL = DEFAULT_API_BASE_URL;

// Function to get the current API URL
export const getApiBaseUrl = async () => {
  const savedUrl = await AsyncStorage.getItem('apiBaseUrl');
  if (savedUrl) {
    API_BASE_URL = savedUrl;
    return savedUrl;
  }
  return DEFAULT_API_BASE_URL;
};

// Function to set the API URL
export const setApiBaseUrl = async (url: string) => {
  const formattedUrl = url.startsWith('http') ? url : `http://${url}:3000`;
  await AsyncStorage.setItem('apiBaseUrl', formattedUrl);
  API_BASE_URL = formattedUrl;

  // Update axios base URL
  api.defaults.baseURL = formattedUrl;

  return formattedUrl;
};

// Initialize API with saved URL or default
export const initializeApi = async () => {
  const url = await getApiBaseUrl();
  API_BASE_URL = url;
};

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Add token to requests
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  register: (name: string, email: string, password: string) =>
    api.post('/api/auth/register', { name, email, password }),

  login: (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }),

  logout: async () => {
    try {
      // Call logout API FIRST with the token
      const response = await api.post('/api/auth/logout');
      // THEN remove token after successful logout
      await AsyncStorage.removeItem('authToken');
      return response;
    } catch (error) {
      // Even if API call fails, still remove the token locally
      await AsyncStorage.removeItem('authToken');
      throw error;
    }
  },

  getCurrentUser: () =>
    api.get('/api/auth/user'),

  updateProfile: (data: {
    name: string;
    email: string;
    currentPassword?: string;
    newPassword?: string;
  }) =>
    api.put('/api/auth/profile', data),
};

export const kitchenStationAPI = {
  getAll: () =>
    api.get('/api/kitchen-stations'),

  create: (name: string, category: string, description?: string) =>
    api.post('/api/kitchen-stations', { name, category, description }),
};

export const employeeAPI = {
  getAll: () =>
    api.get('/api/employees'),

  create: (data: {
    name: string;
    email: string;
    phone: string;
    password: string;
    role: 'cashier' | 'kitchen';
    assignedStationId?: number;
    assignedCategories?: number[];
    joinDate?: string;
  }) =>
    api.post('/api/employees', data),

  getById: (id: string | number) =>
    api.get(`/api/employees/${id}`),

  update: (id: string | number, data: any) =>
    api.put(`/api/employees/${id}`, data),

  delete: (id: string | number) =>
    api.delete(`/api/employees/${id}`),
};

export const employeesAPI = employeeAPI;

export const menuCategoryAPI = {
  getAll: () =>
    api.get('/api/menu-categories'),

  create: (data: {
    name: string;
    description?: string;
    icon?: string;
  }) =>
    api.post('/api/menu-categories', data),

  update: (id: string | number, data: {
    name?: string;
    description?: string;
    icon?: string;
    status?: 'active' | 'inactive';
  }) =>
    api.put(`/api/menu-categories/${id}`, data),

  delete: (id: string | number) =>
    api.delete(`/api/menu-categories/${id}`),
};

export const menuItemAPI = {
  getAll: () =>
    api.get('/api/menu-items'),

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
  }) =>
    api.post('/api/menu-items', data),

  update: (id: string | number, data: {
    name?: string;
    categoryId?: number;
    price?: number;
    description?: string;
    status?: 'available' | 'unavailable';
    hasSize?: boolean;
    sizes?: string[];
    hasFlavor?: boolean;
    flavors?: string[];
  }) =>
    api.put(`/api/menu-items/${id}`, data),

  delete: (id: string | number) =>
    api.delete(`/api/menu-items/${id}`),
};

export const ordersAPI = {
  create: (data: {
    orderNumber: string;
    cashierId?: number;
    cashier?: string;
    subtotal?: number;
    discount?: number;
    total: number;
    payment: {
      method: 'cash' | 'card' | 'digital';
      amount: number;
      amountReceived?: number;
      change?: number;
    };
    items: Array<{
      id: string;
      name: string;
      price: number;
      quantity: number;
      total: number;
      modifiers?: any;
    }>;
    status?: string;
    createdAt?: string;
    customerName?: string;
  }) =>
    api.post('/api/orders', data),

  getAll: (status?: string) =>
    api.get('/api/orders', { params: { status } }),

  getById: (id: string | number) =>
    api.get(`/api/orders/${id}`),

  updateStatus: (id: string | number, status: string) =>
    api.put(`/api/orders/${id}/status`, { status }),

  // Kitchen Display - Get incoming orders
  getIncomingByCategories: (data?: any) =>
    api.post('/api/kitchen/orders/incoming', data || {}),

  // Kitchen Display - Get completed orders
  getCompletedByCategories: (data?: any) =>
    api.post('/api/kitchen/orders/completed', data || {}),

  // Kitchen Display - Update order status
  updateOrderStatus: (id: string | number, status: string) =>
    api.put(`/api/orders/${id}/status`, { status }),
};

export const paymentsAPI = {
  create: (data: {
    orderId: number;
    method: 'cash' | 'card' | 'digital';
    amount: number;
    amountReceived?: number;
    change?: number;
  }) =>
    api.post('/api/payments', data),
};

export const logsAPI = {
  getAll: (filters?: {
    userId?: number;
    action?: string;
    module?: string;
    limit?: number;
    offset?: number;
  }) =>
    api.get('/api/logs', { params: filters }),

  getEntityLogs: (entityType: string, entityId: number) =>
    api.get(`/api/logs/entity/${entityType}/${entityId}`),

  getUserLogs: (userId: number) =>
    api.get(`/api/logs/user/${userId}`),
};

export const feedbackAPI = {
  // Submit feedback (no auth required)
  submit: (data: {
    orderNumber?: string;
    rating: number;
    comment?: string;
    tags?: string[];
    googleFormResponseId?: string;
  }) =>
    api.post('/api/feedback/submit', data),

  // Get all feedback with filtering
  getAll: (status?: string, limit?: number, offset?: number) =>
    api.get('/api/feedback', {
      params: { status, limit, offset }
    }),

  // Get feedback by ID
  getById: (id: string | number) =>
    api.get(`/api/feedback/${id}`),

  // Update feedback status
  update: (id: string | number, data: {
    status?: 'pending' | 'processed' | 'archived';
    processed?: boolean;
    aiAnalysis?: any;
    themes?: string[];
    sentiment?: string;
  }) =>
    api.put(`/api/feedback/${id}`, data),

  // Delete feedback
  delete: (id: string | number) =>
    api.delete(`/api/feedback/${id}`),

  // Get feedback analytics
  getAnalytics: (startDate?: string, endDate?: string, limit?: number) =>
    api.get('/api/feedback/analytics', {
      params: { startDate, endDate, limit }
    }),
};

export default api;