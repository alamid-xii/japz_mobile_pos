import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://10.241.65.96:3000'; // Your PC's IP address

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

export default api;