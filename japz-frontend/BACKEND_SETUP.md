# Backend Setup Guide - JAPZ MobilePOS

## 1. DATABASE SETUP (phpMyAdmin)

### Create Database
```sql
CREATE DATABASE japz_pos;
USE japz_pos;
```

### Create Users Table
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  role ENUM('admin', 'cashier', 'kitchen') DEFAULT 'admin',
  station VARCHAR(100),
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Create Sessions Table (for token management)
```sql
CREATE TABLE sessions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

## 2. BACKEND API (Node.js + Express)

### Setup Steps

1. **Create a backend folder** (outside your React Native project):
```bash
mkdir japz-pos-backend
cd japz-pos-backend
npm init -y
npm install express mysql2 cors dotenv bcryptjs jsonwebtoken
```

2. **Create .env file**:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=japz_pos
JWT_SECRET=your_secret_key_here
PORT=3000
```

3. **Create server.js**:

```javascript
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// REGISTRATION ENDPOINT
app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'All fields required' });
  }

  try {
    const connection = await pool.getConnection();
    
    // Check if user exists
    const [existing] = await connection.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      connection.release();
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with default role = 'admin'
    await connection.query(
      'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
      [email, hashedPassword, name, 'admin']
    );

    connection.release();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// LOGIN ENDPOINT
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    const connection = await pool.getConnection();
    
    // Find user
    const [users] = await connection.query(
      'SELECT id, password, name, role, station FROM users WHERE email = ? AND status = ?',
      [email, 'active']
    );

    if (users.length === 0) {
      connection.release();
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    // Compare password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      connection.release();
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email, 
        role: user.role,
        name: user.name,
        station: user.station
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Store session in database
    await connection.query(
      'INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))',
      [user.id, token]
    );

    connection.release();

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email,
        name: user.name,
        role: user.role,
        station: user.station,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// VERIFY TOKEN ENDPOINT
app.post('/api/auth/verify', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const connection = await pool.getConnection();
    const [sessions] = await connection.query(
      'SELECT id FROM sessions WHERE token = ? AND expires_at > NOW()',
      [token]
    );
    connection.release();

    if (sessions.length === 0) {
      return res.status(401).json({ error: 'Session expired' });
    }

    res.json({ valid: true, user: decoded });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// LOGOUT ENDPOINT
app.post('/api/auth/logout', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  try {
    const connection = await pool.getConnection();
    await connection.query('DELETE FROM sessions WHERE token = ?', [token]);
    connection.release();
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Logout failed' });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server running on port ${process.env.PORT || 3000}`);
});
```

---

## 3. INTEGRATE WITH REACT NATIVE APP

### Update useAuth hook:

```typescript
// hooks/useAuth.tsx
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'cashier' | 'kitchen';
  station?: string;
}

const API_URL = 'http://your-backend-url:3000/api';

interface AuthStore {
  user: User | null;
  token: string | null;
  setUser: (user: User | null) => void;
  register: (email: string, password: string, name: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  restore: () => Promise<void>;
}

export const useAuth = create<AuthStore>((set) => ({
  user: null,
  token: null,

  setUser: (user) => set({ user }),

  register: async (email, password, name) => {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }
  },

  login: async (email, password) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();
    set({ user: data.user, token: data.token });
    await AsyncStorage.setItem('authToken', data.token);
    await AsyncStorage.setItem('user', JSON.stringify(data.user));
  },

  logout: async () => {
    const token = (state: AuthStore) => state.token;
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    set({ user: null, token: null });
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('user');
  },

  restore: async () => {
    const token = await AsyncStorage.getItem('authToken');
    const user = await AsyncStorage.getItem('user');
    if (token && user) {
      set({ token, user: JSON.parse(user) });
    }
  },
}));
```

---

## 4. UPDATE LOGIN COMPONENT

Replace your login.tsx handleLogin with:

```typescript
const handleLogin = async () => {
  if (!email || !password) {
    setError('Please enter both email and password');
    return;
  }
  
  setLoading(true);
  try {
    await login(email, password);
    const { user } = useAuth.getState();
    
    if (user.role === 'admin') {
      router.replace('/admin/dashboard' as any);
    } else if (user.role === 'cashier') {
      router.replace('/cashier/pos' as any);
    } else {
      router.replace('/kitchen/display' as any);
    }
  } catch (err) {
    setError(err.message || 'Login failed');
  } finally {
    setLoading(false);
  }
};
```

---

## 5. RUN THE BACKEND

```bash
node server.js
```

Your backend will be running on `http://localhost:3000`

---

## Summary

✅ **Registration**: Creates user with default role = 'admin'
✅ **Login**: Validates password, returns JWT token
✅ **Sessions**: Stored in database for tracking
**4. Roles**: Supported (admin, cashier, kitchen)
✅ **Secure**: Passwords hashed with bcryptjs
