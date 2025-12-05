import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://10.82.31.96:3000'; // Your PC's IP address

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
    await AsyncStorage.removeItem('authToken');
    return api.post('/api/auth/logout');
  },

  getCurrentUser: () =>
    api.get('/api/auth/user'),
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

export default api;