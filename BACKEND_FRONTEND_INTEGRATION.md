# Backend-Frontend Integration Guide

## Overview
Your React Native frontend will communicate with your XianFire Node.js backend via HTTP API calls. Instead of using the XianFire web templates, we'll create REST API endpoints for the mobile app.

## Step 1: Set Up Backend API Endpoints

### 1.1 Update `japz-backend/index.js` to use Express with JSON API

Replace your current setup with this:

```javascript
import express from 'express';
import session from 'express-session';
import cors from 'cors';
import bcrypt from 'bcrypt';
import { User, sequelize } from './models/userModel.js';

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
}));

// Sync database
await sequelize.sync();

// ========== AUTH ROUTES ==========

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields required' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({ name, email, password: hashed });

    res.status(201).json({
      message: 'Registration successful',
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Compare password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    // Create session
    req.session.userId = user.id;

    res.json({
      message: 'Login successful',
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logout successful' });
});

// Get current user
app.get('/api/auth/user', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  res.json({ userId: req.session.userId });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
```

### 1.2 Install CORS

```bash
cd japz-backend
npm install cors
```

## Step 2: Create API Service in Frontend

### 2.1 Create `japz-frontend/services/api.ts`

```typescript
import axios from 'axios';

const API_BASE_URL = 'http://192.168.x.x:3000'; // Replace with your PC's IP or use 'http://localhost:3000' for emulator

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Add token to requests if needed
api.interceptors.request.use((config) => {
  return config;
});

export const authAPI = {
  register: (name: string, email: string, password: string) =>
    api.post('/api/auth/register', { name, email, password }),

  login: (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }),

  logout: () =>
    api.post('/api/auth/logout'),

  getCurrentUser: () =>
    api.get('/api/auth/user'),
};

export default api;
```

### 2.2 Install Axios in Frontend

```bash
cd japz-frontend
npm install axios
```

## Step 3: Update Frontend Auth Hook

### 3.1 Update `japz-frontend/hooks/useAuth.tsx`

```typescript
import { useRouter } from 'expo-router';
import { createContext, useContext, useState } from 'react';
import { authAPI } from '../services/api';

interface User {
  id: string;
  name: string;
  email: string;
  role?: 'admin' | 'cashier' | 'kitchen';
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authAPI.login(email, password);
      setUser(response.data.user);
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
      const response = await authAPI.register(name, email, password);
      setUser(response.data.user);
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
      await authAPI.logout();
      setUser(null);
    } catch (err: any) {
      console.error('Logout error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, setUser, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

## Step 4: Update Frontend Pages

### 4.1 Update `japz-frontend/app/auth/registration.tsx`

```typescript
import { useRouter } from 'expo-router';
import { Eye, EyeOff } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { authStyles } from '../../styles/authStyles';

export default function RegistrationScreen() {
  const router = useRouter();
  const { register, loading } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      try {
        await register(formData.name, formData.email, formData.password);
        Alert.alert('Success', 'Registration successful!');
        router.replace('/admin/dashboard' as any);
      } catch (err: any) {
        Alert.alert('Registration Failed', err.message);
      }
    }
  };

  return (
    <ScrollView style={authStyles.container} contentContainerStyle={authStyles.content}>
      <View style={{ height: 30 }} />

      <Image
        source={require('../../assets/images/logo.jpg')}
        style={[authStyles.logo, { alignSelf: 'center' }] as any}
        resizeMode="contain"
      />

      <Text style={[authStyles.title, { marginTop: -50 }]}>Create Your Account</Text>
      <Text style={authStyles.subtitle}>Get started with JAPZ MobilePOS</Text>

      <View style={authStyles.form}>
        <View style={authStyles.inputGroup}>
          <Text style={authStyles.label}>Full Name</Text>
          <TextInput
            style={[authStyles.input, errors.name && authStyles.inputError]}
            placeholder="Enter your full name"
            placeholderTextColor="#C3C3C3"
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
            autoCapitalize="words"
          />
          {errors.name && <Text style={authStyles.errorText}>{errors.name}</Text>}
        </View>

        <View style={authStyles.inputGroup}>
          <Text style={authStyles.label}>Email Address</Text>
          <TextInput
            style={[authStyles.input, errors.email && authStyles.inputError]}
            placeholder="Enter your email"
            placeholderTextColor="#C3C3C3"
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {errors.email && <Text style={authStyles.errorText}>{errors.email}</Text>}
        </View>

        <View style={authStyles.inputGroup}>
          <Text style={authStyles.label}>Password</Text>
          <View style={{ position: 'relative' }}>
            <TextInput
              style={[authStyles.input, errors.password && authStyles.inputError]}
              placeholder="Enter password"
              placeholderTextColor="#C3C3C3"
              value={formData.password}
              onChangeText={(text) => setFormData({ ...formData, password: text })}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: [{ translateY: -12 }],
              }}
              onPress={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff size={20} color="#666" />
              ) : (
                <Eye size={20} color="#666" />
              )}
            </TouchableOpacity>
          </View>
          {errors.password && <Text style={authStyles.errorText}>{errors.password}</Text>}
        </View>

        <View style={authStyles.inputGroup}>
          <Text style={authStyles.label}>Confirm Password</Text>
          <View style={{ position: 'relative' }}>
            <TextInput
              style={[authStyles.input, errors.confirmPassword && authStyles.inputError]}
              placeholder="Confirm password"
              placeholderTextColor="#C3C3C3"
              value={formData.confirmPassword}
              onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
              secureTextEntry={!showConfirmPassword}
            />
            <TouchableOpacity
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: [{ translateY: -12 }],
              }}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? (
                <EyeOff size={20} color="#666" />
              ) : (
                <Eye size={20} color="#666" />
              )}
            </TouchableOpacity>
          </View>
          {errors.confirmPassword && <Text style={authStyles.errorText}>{errors.confirmPassword}</Text>}
        </View>

        <TouchableOpacity
          style={[authStyles.primaryButton, loading && authStyles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={authStyles.primaryButtonText}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={authStyles.linkButton} onPress={() => router.push('./login')}>
        <Text>
          Already have an account? <Text style={[authStyles.linkHighlight, authStyles.linkText]}>Login</Text>
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
```

### 4.2 Update `japz-frontend/app/auth/login.tsx`

```typescript
import { useRouter } from 'expo-router';
import { Eye, EyeOff } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { authStyles } from '../../styles/authStyles';

export default function LoginScreen() {
  const router = useRouter();
  const { login, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    try {
      await login(email, password);
      setError('');
      // Navigation happens automatically in useAuth
      router.replace('/admin/dashboard' as any);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  };

  return (
    <ScrollView style={authStyles.container} contentContainerStyle={authStyles.content}>
      <View style={{ height: 30 }} />

      <Image
        source={require('../../assets/images/logo.jpg')}
        style={[authStyles.logo, { alignSelf: 'center' }] as any}
        resizeMode="contain"
      />

      <Text style={[authStyles.subtitle, { marginTop: -50 }]}>Welcome back to JAPZ MobilePOS</Text>

      {error && (
        <View style={authStyles.demoBox}>
          <Text style={{ color: '#ff4444' }}>{error}</Text>
        </View>
      )}

      <View style={authStyles.form}>
        <View style={authStyles.inputGroup}>
          <Text style={authStyles.label}>Email</Text>
          <TextInput
            style={authStyles.input}
            placeholder="Enter your email"
            placeholderTextColor="#C3C3C3"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={authStyles.inputGroup}>
          <Text style={authStyles.label}>Password</Text>
          <View style={{ position: 'relative' }}>
            <TextInput
              style={authStyles.input}
              placeholder="Enter your password"
              placeholderTextColor="#C3C3C3"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: [{ translateY: -12 }],
              }}
              onPress={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff size={20} color="#666" />
              ) : (
                <Eye size={20} color="#666" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[authStyles.primaryButton, loading && authStyles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={authStyles.primaryButtonText}>
            {loading ? 'Logging in...' : 'Login'}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={authStyles.linkButton} onPress={() => router.push('./registration')}>
        <Text>
          Don't have an account? <Text style={[authStyles.linkHighlight, authStyles.linkText]}>Register here</Text>
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
```

## Step 5: Network Configuration

### For Android Emulator:
- Use `10.0.2.2:3000` instead of `localhost:3000`

### For Physical Device:
- Find your PC's local IP: `ipconfig` (look for IPv4 Address)
- Use `http://192.168.x.x:3000` (replace with your IP)

### Update `japz-frontend/services/api.ts`:
```typescript
const API_BASE_URL = 'http://10.0.2.2:3000'; // For Android emulator
// OR
// const API_BASE_URL = 'http://192.168.1.10:3000'; // For physical device (replace IP)
```

## Step 6: Start Everything

### Terminal 1 - Backend:
```bash
cd japz-backend
npm run migrate  # First time only
npm run xian     # Start server
```

### Terminal 2 - Frontend:
```bash
cd japz-frontend
npm start
```

## Testing

1. Try registering a new account on the registration page
2. Check if data appears in your MySQL database
3. Try logging in with the registered account
4. Verify user is authenticated and redirected to dashboard

---

**Questions?** Let me know what specific part needs clarification!
