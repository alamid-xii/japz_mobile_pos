

import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import { sequelize } from "../models/db.js";
import { homePage } from "../controllers/homeController.js";
import { loginPage, registerPage, forgotPasswordPage, dashboardPage, loginUser, registerUser, logoutUser } from "../controllers/authController.js";
import { User } from "../models/userModel.js";
import { Employee } from "../models/employeeModel.js";

import { createLog, getClientIp, getLogs } from "../utils/logger.js";
import { KitchenStation } from "../models/kitchenStationModel.js";
import { MenuCategory } from "../models/menuCategoryModel.js";
import { MenuItem } from "../models/menuItemModel.js";
import { Order } from "../models/orderModel.js";
import { OrderItem } from "../models/orderItemModel.js";
import { Payment } from "../models/paymentModel.js";
import { Log } from "../models/logModel.js";
import { Feedback } from "../models/feedbackModel.js";
import { Discount } from "../models/discountModel.js";
import { Voucher } from "../models/voucherModel.js";
import { BusinessHours } from "../models/businessHoursModel.js";
import { analyzeWithKeywords } from "../services/gemmaService.js";
import { sendVerificationCode, verifyCode, sendApprovalEmail, sendPasswordResetCode, verifyPasswordResetCode } from "../services/emailService.js";
// ── PAYROLL MODULE ─────────────────────────────────────────────────────────
import payrollRouter from './payrollRoutes.js';
import employeeRouter from './employeeRoutes.js';
import * as payrollController from '../controllers/payrollController.js';
import { seedDefaultConfigs } from '../services/payrollConfigService.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

// ========== WEB PAGES ==========
router.get("/", homePage);
router.get("/login", loginPage);
router.post("/login", loginUser);
router.get("/register", registerPage);
router.post("/register", registerUser);
router.get("/forgot-password", forgotPasswordPage);
router.get("/dashboard", dashboardPage);
router.get("/logout", logoutUser);

// ========== JWT MIDDLEWARE ==========
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ========== ADMIN MIDDLEWARE (GAP-02 Fix) ==========
// requireAdmin does NOT exist in the original codebase — we created it for payroll.
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Forbidden: Admin access required' });
  }
  next();
};



// ========== API ENDPOINTS FOR MOBILE APP ==========

// Send verification code to email (Step 1 of registration)
router.post("/api/auth/send-verification", async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email || !name) {
      return res.status(400).json({ error: 'Email and name are required' });
    }

    // Validate email format
    if (!/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if email already has a pending or approved account
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      if (existingUser.status === 'pending') {
        return res.status(400).json({ error: 'This email already has a pending registration. Please wait for admin approval or contact support.' });
      }
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Send verification code
    await sendVerificationCode(email, name);

    res.json({ message: 'Verification code sent to your email' });
  } catch (error) {
    console.error('Send verification error:', error);
    res.status(500).json({ error: error.message || 'Failed to send verification code' });
  }
});

// Verify code and complete registration (Step 2 of registration)
router.post("/api/auth/verify-and-register", async (req, res) => {
  try {
    const { name, email, password, verificationCode } = req.body;

    if (!name || !email || !password || !verificationCode) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Verify the code
    const verification = verifyCode(email, verificationCode);
    if (!verification.valid) {
      return res.status(400).json({ error: verification.error });
    }

    // Check if user already exists (double-check)
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      if (existingUser.status === 'pending') {
        return res.status(400).json({ error: 'This email already has a pending registration. Please wait for admin approval or contact support.' });
      }
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password and create user
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashed,
      status: 'pending',
      role: 'cashier' // Default role, admin will change if needed
    });

    const ipAddress = getClientIp(req);
    await createLog({
      action: 'REGISTER',
      module: 'auth',
      userId: user.id,
      userName: user.name,
      description: `New user registered (email verified): ${user.name} (${user.email})`,
      ipAddress,
      status: 'success'
    });

    res.status(201).json({
      message: 'Registration successful! Please wait for admin approval.',
      user: { id: user.id, name: user.name, email: user.email, status: user.status }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Register (legacy - keeping for backward compatibility)
router.post("/api/auth/register", async (req, res) => {
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

    // Create user with pending status (admin will approve and assign role)
    const user = await User.create({ name, email, password: hashed, status: 'pending', role: 'cashier' });

    res.status(201).json({
      message: 'Registration submitted! Please wait for admin approval.',
      user: { id: user.id, name: user.name, email: user.email, status: user.status }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login
router.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const ipAddress = getClientIp(req);

    // Validation
    if (!email || !password) {
      await createLog({
        action: 'LOGIN',
        module: 'auth',
        description: 'Login attempt with missing credentials',
        ipAddress,
        status: 'failed',
        errorMessage: 'Email and password required'
      });
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Find user in Users table
    let user = await User.findOne({ where: { email } });
    if (!user) {
      await createLog({
        action: 'LOGIN',
        module: 'auth',
        description: `Login attempt for non-existent user: ${email}`,
        ipAddress,
        status: 'failed',
        errorMessage: 'User not found'
      });
      return res.status(401).json({ error: 'Incorrect email or password' });
    }

    // Check if user account is pending approval
    if (user.status === 'pending') {
      await createLog({
        action: 'LOGIN',
        module: 'auth',
        userId: user.id,
        userName: user.name,
        description: `Login attempt by pending user: ${user.name}`,
        ipAddress,
        status: 'failed',
        errorMessage: 'Account pending approval'
      });
      return res.status(403).json({ error: 'Your account is pending admin approval. Please wait for an administrator to approve your account.' });
    }

    // Check if user account is rejected
    if (user.status === 'rejected') {
      return res.status(403).json({ error: 'Your account has been rejected. Please contact an administrator.' });
    }

    // Check if employee is deactivated
    if (user.status === 'inactive') {
      await createLog({
        action: 'LOGIN',
        module: 'auth',
        userId: user.id,
        userName: user.name,
        description: `Login attempt by inactive user: ${user.name}`,
        ipAddress,
        status: 'failed',
        errorMessage: 'Account deactivated'
      });
      return res.status(403).json({ error: 'Your account has been deactivated. Please contact an administrator.' });
    }

    // Compare password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      await createLog({
        action: 'LOGIN',
        module: 'auth',
        userId: user.id,
        userName: user.name,
        description: `Failed login attempt for user: ${user.name}`,
        ipAddress,
        status: 'failed',
        errorMessage: 'Incorrect password'
      });
      return res.status(401).json({ error: 'Incorrect email or password' });
    }

    // Create JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Log successful login
    await createLog({
      action: 'LOGIN',
      module: 'auth',
      userId: user.id,
      userName: user.name,
      description: `Successful login: ${user.name} (${user.email})`,
      ipAddress,
      status: 'success'
    });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        assignedCategories: user.assignedCategories || []
      }
    });
  } catch (error) {
    await createLog({
      action: 'LOGIN',
      module: 'auth',
      description: 'Login error',
      status: 'failed',
      errorMessage: error.message
    });
    res.status(500).json({ error: error.message });
  }
});

// Logout (client-side, just removes token from storage)
router.post("/api/auth/logout", verifyToken, async (req, res) => {
  try {
    // Log the logout action
    await createLog({
      userId: req.user.id,
      userName: req.user.name,
      action: 'LOGOUT',
      module: 'AUTH',
      description: `User ${req.user.name} logged out`,
      status: 'success',
      ipAddress: getClientIp(req)
    });

    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Error logging logout:', error);
    // Still return success even if logging fails
    res.json({ message: 'Logout successful' });
  }
});

// ========== PASSWORD RESET API ==========

// Send password reset code
router.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const ipAddress = getClientIp(req);

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user exists
    const user = await User.findOne({ where: { email } });
    if (!user) {
      await createLog({
        action: 'PASSWORD_RESET',
        module: 'auth',
        description: `Password reset attempt for non-existent email: ${email}`,
        ipAddress,
        status: 'failed',
        errorMessage: 'User not found'
      });
      // Return success anyway to prevent email enumeration
      return res.json({ message: 'If an account with that email exists, a password reset code has been sent.' });
    }

    // Send password reset code
    await sendPasswordResetCode(email, user.name);

    await createLog({
      action: 'PASSWORD_RESET',
      module: 'auth',
      userId: user.id,
      userName: user.name,
      description: `Password reset code sent to: ${user.email}`,
      ipAddress,
      status: 'success'
    });

    res.json({ message: 'Password reset code sent to your email.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to send reset code. Please try again.' });
  }
});

// Verify reset code and update password
router.post("/api/auth/reset-password", async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    const ipAddress = getClientIp(req);

    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'Email, code, and new password are required' });
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    if (!/[A-Z]/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must contain at least one uppercase letter' });
    }
    if (!/[a-z]/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must contain at least one lowercase letter' });
    }
    if (!/[0-9]/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must contain at least one number' });
    }

    // Verify the reset code
    const isValidCode = verifyPasswordResetCode(email, code);
    if (!isValidCode) {
      await createLog({
        action: 'PASSWORD_RESET',
        module: 'auth',
        description: `Invalid or expired reset code for: ${email}`,
        ipAddress,
        status: 'failed',
        errorMessage: 'Invalid or expired code'
      });
      return res.status(400).json({ error: 'Invalid or expired reset code. Please request a new code.' });
    }

    // Find user and update password
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await user.update({ password: hashedPassword });

    await createLog({
      action: 'PASSWORD_RESET',
      module: 'auth',
      userId: user.id,
      userName: user.name,
      description: `Password successfully reset for: ${user.name} (${user.email})`,
      ipAddress,
      status: 'success'
    });

    res.json({ message: 'Password reset successful! You can now login with your new password.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password. Please try again.' });
  }
});

// ========== USER APPROVAL API ==========

// Get all pending users
router.get("/api/users/pending", verifyToken, async (req, res) => {
  try {
    const pendingUsers = await User.findAll({
      where: { status: 'pending' },
      attributes: ['id', 'name', 'email', 'createdAt'],
      order: [['createdAt', 'ASC']]
    });
    res.json(pendingUsers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all approved users (includes inactive for management)
router.get("/api/users/approved", verifyToken, async (req, res) => {
  try {
    const approvedUsers = await User.findAll({
      where: { status: { [Op.in]: ['approved', 'inactive'] } },
      attributes: ['id', 'name', 'email', 'role', 'status', 'createdAt', 'assignedCategories'],
      order: [['status', 'ASC'], ['createdAt', 'DESC']] // Show active first, then inactive
    });
    res.json(approvedUsers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve a pending user and assign a role
router.put("/api/users/:id/approve", verifyToken, async (req, res) => {
  try {
    const { role, assignedCategories } = req.body;
    if (!role || !['cashier', 'kitchen', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Valid role required (cashier, kitchen, or admin)' });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.status !== 'pending') return res.status(400).json({ error: 'User is not pending' });

    user.role = role;
    user.status = 'approved';

    // Save assigned categories for kitchen staff
    if (role === 'kitchen' && assignedCategories && Array.isArray(assignedCategories)) {
      user.assignedCategories = assignedCategories;
    } else {
      user.assignedCategories = [];
    }

    await user.save();

    // Auto-sync approved staff to Employee table for payroll
    try {
      let emp = await Employee.findOne({ where: { [Op.or]: [{ userId: user.id }, { email: user.email }] } });
      if (!emp) {
        await Employee.create({
          name: user.name,
          email: user.email,
          phone: '',
          password: user.password,
          role: role === 'admin' ? 'cashier' : role,
          status: 'active',
          hourlyRate: user.hourlyRate || 75.00,
          userId: user.id
        });
      } else {
        emp.userId = user.id;
        emp.role = role === 'admin' ? 'cashier' : role;
        emp.status = 'active';
        await emp.save();
      }
    } catch (syncErr) {
      console.warn('Auto Employee sync warning:', syncErr.message);
    }

    await createLog({
      userId: req.user.id,
      userName: req.user.name,
      action: 'APPROVE_USER',
      module: 'employees',
      entityId: user.id,
      entityType: 'User',
      description: `Approved user ${user.name} (${user.email}) with role: ${role}${role === 'kitchen' && assignedCategories?.length ? ` and categories: ${assignedCategories.join(', ')}` : ''}`,
      ipAddress: getClientIp(req),
      status: 'success'
    });

    // Send approval email notification
    try {
      await sendApprovalEmail(user.email, user.name, true, role);
    } catch (emailError) {
      console.error('Failed to send approval email:', emailError);
      // Don't fail the request if email fails
    }

    res.json({
      message: `User approved as ${role}`,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status, assignedCategories: user.assignedCategories }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reject a pending user
router.put("/api/users/:id/reject", verifyToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.status !== 'pending') return res.status(400).json({ error: 'User is not pending' });

    user.status = 'rejected';
    await user.save();

    await createLog({
      userId: req.user.id,
      userName: req.user.name,
      action: 'REJECT_USER',
      module: 'employees',
      entityId: user.id,
      entityType: 'User',
      description: `Rejected user ${user.name} (${user.email})`,
      ipAddress: getClientIp(req),
      status: 'success'
    });

    // Send rejection email notification
    try {
      await sendApprovalEmail(user.email, user.name, false);
    } catch (emailError) {
      console.error('Failed to send rejection email:', emailError);
      // Don't fail the request if email fails
    }

    res.json({ message: 'User rejected', user: { id: user.id, name: user.name, status: user.status } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle user status (activate/deactivate)
router.put("/api/users/:id/toggle-status", verifyToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Only allow toggling between approved and inactive
    if (user.status !== 'approved' && user.status !== 'inactive') {
      return res.status(400).json({ error: 'Can only activate/deactivate approved users' });
    }

    // Prevent deactivating yourself
    if (user.id === req.user.id) {
      return res.status(400).json({ error: 'You cannot deactivate your own account' });
    }

    const newStatus = user.status === 'approved' ? 'inactive' : 'approved';
    user.status = newStatus;
    await user.save();

    // Sync status to Employee table
    try {
      const emp = await Employee.findOne({ where: { [Op.or]: [{ userId: user.id }, { email: user.email }] } });
      if (emp) {
        emp.status = newStatus === 'approved' ? 'active' : 'inactive';
        await emp.save();
      }
    } catch (syncErr) {
      console.warn('Auto Employee status sync warning:', syncErr.message);
    }

    await createLog({
      userId: req.user.id,
      userName: req.user.name,
      action: newStatus === 'inactive' ? 'DEACTIVATE_USER' : 'ACTIVATE_USER',
      module: 'employees',
      entityId: user.id,
      entityType: 'User',
      description: `${newStatus === 'inactive' ? 'Deactivated' : 'Activated'} user ${user.name} (${user.email})`,
      ipAddress: getClientIp(req),
      status: 'success'
    });

    res.json({
      message: `User ${newStatus === 'inactive' ? 'deactivated' : 'activated'} successfully`,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user role (for approved users)
router.put("/api/users/:id/role", verifyToken, async (req, res) => {
  try {
    const { role, assignedCategories } = req.body;
    if (!role || !['cashier', 'kitchen', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Valid role required (cashier, kitchen, or admin)' });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Only allow updating approved or inactive users
    if (user.status !== 'approved' && user.status !== 'inactive') {
      return res.status(400).json({ error: 'Can only update role for approved users' });
    }

    const oldRole = user.role;
    user.role = role;

    // Save assigned categories for kitchen staff
    if (role === 'kitchen' && assignedCategories && Array.isArray(assignedCategories)) {
      user.assignedCategories = assignedCategories;
    } else {
      user.assignedCategories = [];
    }

    await user.save();

    await createLog({
      userId: req.user.id,
      userName: req.user.name,
      action: 'UPDATE_USER_ROLE',
      module: 'employees',
      entityId: user.id,
      entityType: 'User',
      description: `Updated user ${user.name} (${user.email}) role from ${oldRole} to ${role}${role === 'kitchen' && assignedCategories?.length ? ` with categories: ${assignedCategories.join(', ')}` : ''}`,
      ipAddress: getClientIp(req),
      status: 'success'
    });

    res.json({
      message: `User role updated to ${role}`,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status, assignedCategories: user.assignedCategories }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current user (protected route)
router.get("/api/auth/user", verifyToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        assignedCategories: user.assignedCategories || []
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user profile (name, email, password)
router.put("/api/auth/profile", verifyToken, async (req, res) => {
  try {
    const { name, email, currentPassword, newPassword } = req.body;
    const ipAddress = getClientIp(req);

    // Validation
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    // Find user
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If password change is requested, verify current password
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password required to change password' });
      }

      const passwordMatch = await bcrypt.compare(currentPassword, user.password);
      if (!passwordMatch) {
        await createLog({
          userId: user.id,
          userName: user.name,
          action: 'UPDATE_PROFILE',
          module: 'auth',
          description: 'Failed profile update: incorrect current password',
          ipAddress,
          status: 'failed',
          errorMessage: 'Current password is incorrect'
        });
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      // Hash new password
      user.password = await bcrypt.hash(newPassword, 10);
    }

    // Update user info
    user.name = name;
    user.email = email;
    await user.save();

    // Log the profile update
    await createLog({
      userId: user.id,
      userName: user.name,
      action: 'UPDATE_PROFILE',
      module: 'auth',
      description: `Profile updated: ${user.name} (${user.email})${newPassword ? ' with password change' : ''}`,
      changes: JSON.stringify({
        before: { name: req.user.name, email: req.user.email },
        after: { name, email, passwordChanged: !!newPassword }
      }),
      ipAddress,
      status: 'success'
    });

    res.json({
      message: 'Profile updated successfully',
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    await createLog({
      userId: req.user?.id,
      userName: req.user?.name || 'Unknown',
      action: 'UPDATE_PROFILE',
      module: 'auth',
      description: 'Profile update error',
      ipAddress: getClientIp(req),
      status: 'failed',
      errorMessage: error.message
    });
    res.status(500).json({ error: error.message });
  }
});

// ========== KITCHEN STATIONS API ==========

// Get all kitchen stations
router.get("/api/kitchen-stations", async (req, res) => {
  try {
    const stations = await KitchenStation.findAll({ where: { status: 'active' } });
    res.json(stations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create kitchen station
router.post("/api/kitchen-stations", verifyToken, async (req, res) => {
  try {
    const { name, category, description } = req.body;
    if (!name || !category) {
      return res.status(400).json({ error: 'Name and category required' });
    }
    const station = await KitchenStation.create({ name, category, description });
    res.status(201).json(station);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ========== MENU CATEGORIES API ==========

// Get all menu categories
router.get("/api/menu-categories", async (req, res) => {
  try {
    const categories = await MenuCategory.findAll({
      where: { status: 'active' },
      order: [['createdAt', 'ASC']]
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create menu category
router.post("/api/menu-categories", verifyToken, async (req, res) => {
  try {
    const { name, description, icon } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    // Check if category already exists
    const existingCategory = await MenuCategory.findOne({ where: { name } });
    if (existingCategory) {
      return res.status(400).json({ error: 'Category already exists' });
    }

    const category = await MenuCategory.create({
      name,
      description: description || '',
      icon: icon || 'dish',
      itemCount: 0,
      status: 'active'
    });

    res.status(201).json({
      message: 'Category created successfully',
      category
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update menu category
router.put("/api/menu-categories/:id", verifyToken, async (req, res) => {
  try {
    const { name, description, icon, status } = req.body;
    const category = await MenuCategory.findByPk(req.params.id);

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    if (name) category.name = name;
    if (description !== undefined) category.description = description;
    if (icon) category.icon = icon;
    if (status) category.status = status;

    await category.save();

    res.json({
      message: 'Category updated successfully',
      category
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete menu category
router.delete("/api/menu-categories/:id", verifyToken, async (req, res) => {
  try {
    const category = await MenuCategory.findByPk(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    await category.destroy();
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== MENU ITEMS API ==========

// Get all menu items
// Get all menu items including archived (admin only)
router.get("/api/menu-items/admin/all", verifyToken, async (req, res) => {
  try {
    const items = await MenuItem.findAll({
      include: [
        {
          model: MenuCategory,
          as: 'category',
          attributes: ['id', 'name'],
        }
      ],
      order: [['createdAt', 'ASC']]
    });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/menu-items", async (req, res) => {
  try {
    const items = await MenuItem.findAll({
      where: { archived: false },
      include: [
        {
          model: MenuCategory,
          as: 'category',
          attributes: ['id', 'name'],
        }
      ],
      order: [['createdAt', 'ASC']]
    });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get menu items by category
router.get("/api/menu-items/category/:categoryId", async (req, res) => {
  try {
    const items = await MenuItem.findAll({
      where: { categoryId: req.params.categoryId, archived: false },
      include: [
        {
          model: MenuCategory,
          as: 'category',
          attributes: ['id', 'name'],
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create menu item
router.post("/api/menu-items", verifyToken, async (req, res) => {
  try {
    const { name, categoryId, price, description, hasSize, sizes, hasFlavor, flavors, hasTemperature, temperatures, trackStock, stock } = req.body;

    if (!name || !categoryId || !price) {
      return res.status(400).json({ error: 'Name, category, and price are required' });
    }

    // Check if category exists
    const category = await MenuCategory.findByPk(categoryId);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const item = await MenuItem.create({
      name,
      categoryId,
      price,
      description: description || '',
      hasSize: hasSize || false,
      sizes: sizes || null,
      hasFlavor: hasFlavor || false,
      flavors: flavors || null,
      hasTemperature: hasTemperature || false,
      temperatures: temperatures || null,
      trackStock: true, // Always on
      defaultStock: req.body.defaultStock || 0,
      stock: req.body.defaultStock || 0,
      status: 'available'
    });

    // Update category item count
    await category.increment('itemCount');

    // Fetch with category info
    const result = await MenuItem.findByPk(item.id, {
      include: [
        {
          model: MenuCategory,
          as: 'category',
          attributes: ['id', 'name'],
        }
      ]
    });

    res.status(201).json({
      message: 'Menu item created successfully',
      item: result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update menu item
router.put("/api/menu-items/:id", verifyToken, async (req, res) => {
  try {
    const { name, categoryId, price, description, status, hasSize, sizes, hasFlavor, flavors, hasTemperature, temperatures, trackStock, stock, archived } = req.body;
    const item = await MenuItem.findByPk(req.params.id);

    if (!item) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    const oldCategoryId = item.categoryId;

    if (name) item.name = name;
    if (price) item.price = price;
    if (description !== undefined) item.description = description;
    if (status !== undefined) item.status = status;
    if (hasSize !== undefined) item.hasSize = hasSize;
    if (sizes !== undefined) item.sizes = sizes;
    if (hasFlavor !== undefined) item.hasFlavor = hasFlavor;
    if (flavors !== undefined) item.flavors = flavors;
    if (hasTemperature !== undefined) item.hasTemperature = hasTemperature;
    if (temperatures !== undefined) item.temperatures = temperatures;
    if (trackStock !== undefined) item.trackStock = true; // Always on
    if (stock !== undefined) item.stock = stock;
    if (req.body.defaultStock !== undefined) item.defaultStock = req.body.defaultStock;
    if (archived !== undefined) item.archived = archived;

    // Handle category change
    if (categoryId && categoryId !== oldCategoryId) {
      const newCategory = await MenuCategory.findByPk(categoryId);
      if (!newCategory) {
        return res.status(404).json({ error: 'Category not found' });
      }

      // Decrement old category count
      const oldCategory = await MenuCategory.findByPk(oldCategoryId);
      if (oldCategory) {
        await oldCategory.decrement('itemCount');
      }

      // Increment new category count
      await newCategory.increment('itemCount');

      item.categoryId = categoryId;
    }

    await item.save();

    const result = await MenuItem.findByPk(item.id, {
      include: [
        {
          model: MenuCategory,
          as: 'category',
          attributes: ['id', 'name'],
        }
      ]
    });

    res.json({
      message: 'Menu item updated successfully',
      item: result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete menu item
router.delete("/api/menu-items/:id", verifyToken, async (req, res) => {
  try {
    const item = await MenuItem.findByPk(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    // Decrement category item count
    const category = await MenuCategory.findByPk(item.categoryId);
    if (category) {
      await category.decrement('itemCount');
    }

    await item.destroy();
    res.json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== STOCK MANAGEMENT API ==========

// Set general default stock for ALL items
router.put("/api/stocks/set-general-default", verifyToken, async (req, res) => {
  try {
    const { defaultStock } = req.body;
    if (defaultStock === undefined || defaultStock < 0) {
      return res.status(400).json({ error: 'defaultStock must be a non-negative number' });
    }
    const val = parseInt(defaultStock);
    const [count] = await MenuItem.update(
      { defaultStock: val, stock: val },
      { where: {} }
    );
    res.json({ message: `Stock set to ${val} for ${count} items`, count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Restock a single item (adds to current stock, does NOT change defaultStock)
router.put("/api/stocks/restock/:id", verifyToken, async (req, res) => {
  try {
    const { quantity } = req.body;
    if (!quantity || quantity < 1) {
      return res.status(400).json({ error: 'Quantity must be at least 1' });
    }
    const item = await MenuItem.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Menu item not found' });

    const newStock = (item.stock || 0) + parseInt(quantity);
    await item.update({ stock: newStock });
    res.json({ message: `Restocked ${item.name} by ${quantity}. New stock: ${newStock}`, item });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manual reset: reset all items' stock to their defaultStock right now
router.post("/api/stocks/reset-now", verifyToken, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const items = await MenuItem.findAll();
    let count = 0;
    for (const item of items) {
      await item.update({ stock: item.defaultStock || 0, lastStockReset: today });
      count++;
    }
    res.json({ message: `Stock reset to defaults for ${count} items`, count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== ORDERS API ==========

// Create order
router.post("/api/orders", verifyToken, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { orderNumber, cashierId, cashier, subtotal, discount, total, payment, items, status, createdAt, customerName, orderType, tableNumber, deliveryAddress, notes } = req.body;

    if (!orderNumber || total === undefined || total === null || !items || !Array.isArray(items) || items.length === 0 || !payment) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Order number, total (can be 0), items array, and payment required' });
    }

    // Create order
    const order = await Order.create({
      orderNumber,
      cashierId: cashierId ? parseInt(cashierId) : (req.user.id ? parseInt(req.user.id) : null),
      customerName,
      subtotal: parseFloat(subtotal || total),
      discount: parseFloat(discount || 0),
      total: parseFloat(total),
      status: status || 'completed',
      orderType: orderType || null,
      tableNumber: tableNumber || null,
      deliveryAddress: deliveryAddress || null,
      notes: notes || null
    }, { transaction });

    // Create order items
    const orderItems = await Promise.all(items.map(item =>
      OrderItem.create({
        orderId: order.id,
        menuItemId: parseInt(item.id),
        name: item.name,
        price: parseFloat(item.price),
        quantity: parseInt(item.quantity),
        total: parseFloat(item.total),
        modifiers: item.modifiers || null
      }, { transaction })
    ));

    // Decrement stock for items that track stock
    for (const item of items) {
      const menuItem = await MenuItem.findByPk(parseInt(item.id), { transaction });
      if (menuItem && menuItem.trackStock && menuItem.stock !== null) {
        const newStock = Math.max(0, menuItem.stock - parseInt(item.quantity));
        await menuItem.update({ stock: newStock }, { transaction });
      }
    }

    // Create payment
    const paymentRecord = await Payment.create({
      orderId: order.id,
      method: payment.method,
      amount: parseFloat(payment.amount),
      amountReceived: payment.amountReceived ? parseFloat(payment.amountReceived) : null,
      change: payment.change ? parseFloat(payment.change) : null,
      status: 'completed'
    }, { transaction });

    await transaction.commit();

    // Log order creation
    await createLog({
      userId: req.user.id,
      userName: req.user.name,
      action: 'CREATE_ORDER',
      module: 'orders',
      entityId: order.id,
      entityType: 'Order',
      description: `Order created: ${orderNumber} by ${req.user.name} for ₱${total}`,
      changes: {
        orderId: order.id,
        customerName,
        orderType,
        total,
        itemCount: items.length
      },
      ipAddress: getClientIp(req),
      status: 'success'
    });

    res.status(201).json({
      message: 'Order created successfully',
      order: {
        ...order.toJSON(),
        items: orderItems,
        payment: paymentRecord
      }
    });
  } catch (error) {
    await transaction.rollback();
    await createLog({
      userId: req.user.id,
      userName: req.user.name,
      action: 'CREATE_ORDER',
      module: 'orders',
      description: 'Error creating order',
      ipAddress: getClientIp(req),
      status: 'failed',
      errorMessage: error.message
    });
    console.error('Order creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all orders (with optional status filter)
router.get("/api/orders", verifyToken, async (req, res) => {
  try {
    const { status } = req.query;
    const where = status ? { status } : {};

    const orders = await Order.findAll({
      where,
      include: [
        {
          model: OrderItem,
          as: 'items'
        },
        {
          model: Payment,
          as: 'payments'
        },
        {
          model: User,
          as: 'cashier',
          attributes: ['id', 'name']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== SALES ANALYTICS ==========

// Get sales analytics with date range
router.get("/api/sales/analytics", verifyToken, async (req, res) => {
  try {
    const { period = 'week', startDate, endDate } = req.query;

    // Calculate date range
    let start, end;
    const now = new Date();
    end = endDate ? new Date(endDate) : new Date(now);

    if (startDate) {
      start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (period === 'today') {
      // Today: from midnight to now
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      end = new Date(now);
    } else if (period === 'week') {
      // Current calendar week: Sunday to Saturday
      const dayOfWeek = now.getDay(); // 0 = Sunday
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek, 0, 0, 0, 0);
      end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else if (period === 'month') {
      // Current month: day 1 through today
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (period === 'year') {
      // Current year: January through current month
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999); // end of current month
    } else {
      start = new Date(now);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    }

    // Get all completed orders in the date range
    const orders = await Order.findAll({
      where: {
        status: {
          [Op.in]: ['completed', 'ready', 'paid']
        },
        createdAt: {
          [Op.between]: [start, end]
        }
      },
      include: [
        { model: OrderItem, as: 'items' },
        { model: Payment, as: 'payments' },
        { model: User, as: 'cashier', attributes: ['id', 'name'] }
      ],
      order: [['createdAt', 'ASC']]
    });

    const itemSales = {};
    const categorySales = {};
    const hourlyDistribution = Array(24).fill(0);
    let totalRevenue = 0;
    let totalOrders = orders.length;
    let totalItems = 0;

    // ===== PERIOD: TODAY — hourly breakdown =====
    if (period === 'today') {
      const currentHour = now.getHours();
      const hourlyMap = {};

      // Initialize hours 0 through current hour
      for (let h = 0; h <= currentHour; h++) {
        const label = `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? 'AM' : 'PM'}`;
        hourlyMap[h] = {
          hour: h,
          dayLabel: label,
          revenue: 0,
          orders: 0,
          items: 0
        };
      }

      orders.forEach(order => {
        const orderDate = new Date(order.createdAt);
        const hour = orderDate.getHours();
        const orderTotal = parseFloat(order.total) || 0;

        if (hourlyMap[hour]) {
          hourlyMap[hour].revenue += orderTotal;
          hourlyMap[hour].orders += 1;
          hourlyMap[hour].items += order.items?.length || 0;
        }

        hourlyDistribution[hour] += orderTotal;
        totalRevenue += orderTotal;

        order.items?.forEach(item => {
          totalItems += item.quantity || 1;
          const itemName = item.name || 'Unknown';
          const categoryId = item.categoryId || 'uncategorized';
          if (!itemSales[itemName]) itemSales[itemName] = { name: itemName, quantity: 0, revenue: 0 };
          itemSales[itemName].quantity += item.quantity || 1;
          itemSales[itemName].revenue += parseFloat(item.subtotal) || 0;
          if (!categorySales[categoryId]) categorySales[categoryId] = { id: categoryId, revenue: 0, count: 0 };
          categorySales[categoryId].revenue += parseFloat(item.subtotal) || 0;
          categorySales[categoryId].count += item.quantity || 1;
        });
      });

      const dailyData = Object.values(hourlyMap).sort((a, b) => a.hour - b.hour);
      const topItems = Object.values(itemSales).sort((a, b) => b.quantity - a.quantity).slice(0, 10);
      const peakHours = hourlyDistribution
        .map((revenue, hour) => ({ hour, revenue }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 3)
        .map(h => ({ hour: h.hour, label: `${h.hour}:00 - ${h.hour + 1}:00`, revenue: h.revenue }));

      return res.json({
        period,
        dateRange: { start: start.toISOString(), end: end.toISOString() },
        summary: {
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          totalOrders,
          totalItems,
          avgDaily: Math.round(totalRevenue * 100) / 100,
          avgOrderValue: totalOrders > 0 ? Math.round((totalRevenue / totalOrders) * 100) / 100 : 0,
          bestDay: null,
          worstDay: null
        },
        dailyData,
        topItems,
        peakHours,
        hourlyDistribution
      });
    }

    // ===== PERIOD: YEAR — monthly breakdown =====
    if (period === 'year') {
      const monthlyMap = {};
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentMonth = now.getMonth(); // 0-indexed

      // Initialize months from January to current month
      for (let m = 0; m <= currentMonth; m++) {
        const key = `${now.getFullYear()}-${String(m + 1).padStart(2, '0')}`;
        monthlyMap[key] = {
          date: key,
          dayLabel: monthNames[m],
          revenue: 0,
          orders: 0,
          items: 0
        };
      }

      orders.forEach(order => {
        const orderDate = new Date(order.createdAt);
        const key = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
        const hour = orderDate.getHours();
        const orderTotal = parseFloat(order.total) || 0;

        if (monthlyMap[key]) {
          monthlyMap[key].revenue += orderTotal;
          monthlyMap[key].orders += 1;
          monthlyMap[key].items += order.items?.length || 0;
        }

        hourlyDistribution[hour] += orderTotal;
        totalRevenue += orderTotal;

        order.items?.forEach(item => {
          totalItems += item.quantity || 1;
          const itemName = item.name || 'Unknown';
          const categoryId = item.categoryId || 'uncategorized';
          if (!itemSales[itemName]) itemSales[itemName] = { name: itemName, quantity: 0, revenue: 0 };
          itemSales[itemName].quantity += item.quantity || 1;
          itemSales[itemName].revenue += parseFloat(item.subtotal) || 0;
          if (!categorySales[categoryId]) categorySales[categoryId] = { id: categoryId, revenue: 0, count: 0 };
          categorySales[categoryId].revenue += parseFloat(item.subtotal) || 0;
          categorySales[categoryId].count += item.quantity || 1;
        });
      });

      const dailyData = Object.values(monthlyMap).sort((a, b) => a.date.localeCompare(b.date));
      const avgMonthly = dailyData.length > 0 ? totalRevenue / dailyData.length : 0;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      const bestDay = dailyData.reduce((best, d) => d.revenue > (best?.revenue || 0) ? d : best, dailyData[0]);
      const worstDay = dailyData.reduce((worst, d) => d.revenue < (worst?.revenue || Infinity) && d.revenue > 0 ? d : worst, dailyData[0]);
      const topItems = Object.values(itemSales).sort((a, b) => b.quantity - a.quantity).slice(0, 10);
      const peakHours = hourlyDistribution
        .map((revenue, hour) => ({ hour, revenue }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 3)
        .map(h => ({ hour: h.hour, label: `${h.hour}:00 - ${h.hour + 1}:00`, revenue: h.revenue }));

      return res.json({
        period,
        dateRange: { start: start.toISOString(), end: end.toISOString() },
        summary: {
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          totalOrders,
          totalItems,
          avgDaily: Math.round(avgMonthly * 100) / 100,
          avgOrderValue: Math.round(avgOrderValue * 100) / 100,
          bestDay,
          worstDay
        },
        dailyData,
        topItems,
        peakHours,
        hourlyDistribution
      });
    }

    // ===== PERIOD: WEEK / MONTH — daily breakdown =====
    const dailyMap = {};

    // Initialize days in range
    const currentDate = new Date(start);
    while (currentDate <= end) {
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const key = `${year}-${month}-${day}`;

      dailyMap[key] = {
        date: key,
        dayLabel: period === 'week'
          ? currentDate.toLocaleDateString('en-US', { weekday: 'short' })
          : currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: 0,
        orders: 0,
        items: 0
      };

      currentDate.setDate(currentDate.getDate() + 1);
    }

    orders.forEach(order => {
      const orderDate = new Date(order.createdAt);
      const year = orderDate.getFullYear();
      const month = String(orderDate.getMonth() + 1).padStart(2, '0');
      const day = String(orderDate.getDate()).padStart(2, '0');
      const key = `${year}-${month}-${day}`;
      const hour = orderDate.getHours();
      const orderTotal = parseFloat(order.total) || 0;

      if (dailyMap[key]) {
        dailyMap[key].revenue += orderTotal;
        dailyMap[key].orders += 1;
        dailyMap[key].items += order.items?.length || 0;
      }

      hourlyDistribution[hour] += orderTotal;
      totalRevenue += orderTotal;

      order.items?.forEach(item => {
        totalItems += item.quantity || 1;
        const itemName = item.name || 'Unknown';
        const categoryId = item.categoryId || 'uncategorized';
        if (!itemSales[itemName]) itemSales[itemName] = { name: itemName, quantity: 0, revenue: 0 };
        itemSales[itemName].quantity += item.quantity || 1;
        itemSales[itemName].revenue += parseFloat(item.subtotal) || 0;
        if (!categorySales[categoryId]) categorySales[categoryId] = { id: categoryId, revenue: 0, count: 0 };
        categorySales[categoryId].revenue += parseFloat(item.subtotal) || 0;
        categorySales[categoryId].count += item.quantity || 1;
      });
    });

    // Calculate metrics
    const dailyData = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
    const avgDaily = dailyData.length > 0 ? totalRevenue / dailyData.length : 0;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const bestDay = dailyData.reduce((best, d) => d.revenue > (best?.revenue || 0) ? d : best, dailyData[0]);
    const worstDay = dailyData.reduce((worst, d) => d.revenue < (worst?.revenue || Infinity) && d.revenue > 0 ? d : worst, dailyData[0]);

    // Top selling items
    const topItems = Object.values(itemSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    // Peak hours (top 3)
    const peakHours = hourlyDistribution
      .map((revenue, hour) => ({ hour, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 3)
      .map(h => ({ hour: h.hour, label: `${h.hour}:00 - ${h.hour + 1}:00`, revenue: h.revenue }));

    res.json({
      period,
      dateRange: { start: start.toISOString(), end: end.toISOString() },
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalOrders,
        totalItems,
        avgDaily: Math.round(avgDaily * 100) / 100,
        avgOrderValue: Math.round(avgOrderValue * 100) / 100,
        bestDay,
        worstDay
      },
      dailyData,
      topItems,
      peakHours,
      hourlyDistribution
    });
  } catch (error) {
    console.error('Sales analytics error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get sales summary for dashboard
router.get("/api/sales/summary", verifyToken, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 6);

    const monthStart = new Date(today);
    monthStart.setDate(1);

    // Today's sales
    const todayOrders = await Order.findAll({
      where: {
        status: { [Op.in]: ['completed', 'ready', 'paid'] },
        createdAt: { [Op.gte]: today }
      }
    });
    const todayRevenue = todayOrders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);

    // Yesterday's sales
    const yesterdayOrders = await Order.findAll({
      where: {
        status: { [Op.in]: ['completed', 'ready', 'paid'] },
        createdAt: { [Op.gte]: yesterday, [Op.lt]: today }
      }
    });
    const yesterdayRevenue = yesterdayOrders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);

    // Week sales
    const weekOrders = await Order.findAll({
      where: {
        status: { [Op.in]: ['completed', 'ready', 'paid'] },
        createdAt: { [Op.gte]: weekStart }
      }
    });
    const weekRevenue = weekOrders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);

    // Month sales
    const monthOrders = await Order.findAll({
      where: {
        status: { [Op.in]: ['completed', 'ready', 'paid'] },
        createdAt: { [Op.gte]: monthStart }
      }
    });
    const monthRevenue = monthOrders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);

    // Calculate growth
    const dailyGrowth = yesterdayRevenue > 0 ? Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100) : 0;

    res.json({
      today: { revenue: todayRevenue, orders: todayOrders.length },
      yesterday: { revenue: yesterdayRevenue, orders: yesterdayOrders.length },
      week: { revenue: weekRevenue, orders: weekOrders.length },
      month: { revenue: monthRevenue, orders: monthOrders.length },
      dailyGrowth
    });
  } catch (error) {
    console.error('Sales summary error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get detailed order report for export with date range
router.get("/api/sales/detailed-report", verifyToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Get all completed orders in the date range with full details
    const orders = await Order.findAll({
      where: {
        status: {
          [Op.in]: ['completed', 'ready', 'paid']
        },
        createdAt: {
          [Op.between]: [start, end]
        }
      },
      include: [
        { model: OrderItem, as: 'items' },
        { model: Payment, as: 'payments' },
        { model: User, as: 'cashier', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'preparedBy', attributes: ['id', 'name', 'email'] }
      ],
      order: [['createdAt', 'ASC']]
    });

    // Process orders into detailed report format
    const detailedOrders = orders.map(order => {
      const orderData = order.toJSON();

      // Calculate preparation time (from order creation to completion)
      let preparationTime = null;
      if (orderData.completedAt && orderData.createdAt) {
        const created = new Date(orderData.createdAt);
        const completed = new Date(orderData.completedAt);
        const diffMs = completed - created;
        const diffMins = Math.floor(diffMs / 60000);
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        preparationTime = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
        orderData.preparationTimeMinutes = diffMins;
      }

      return {
        orderNumber: orderData.orderNumber,
        customerName: orderData.customerName || 'Walk-in Customer',
        orderType: orderData.orderType || 'N/A',
        tableNumber: orderData.tableNumber || null,
        deliveryAddress: orderData.deliveryAddress || null,
        status: orderData.status,
        subtotal: parseFloat(orderData.subtotal) || 0,
        discount: parseFloat(orderData.discount) || 0,
        total: parseFloat(orderData.total) || 0,
        cashierName: orderData.cashier?.name || 'N/A',
        preparedByName: orderData.preparedBy?.name || 'N/A',
        preparationTime: preparationTime || 'N/A',
        preparationTimeMinutes: orderData.preparationTimeMinutes || 0,
        createdAt: orderData.createdAt,
        completedAt: orderData.completedAt,
        notes: orderData.notes || null,
        items: orderData.items?.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: parseFloat(item.price) || 0,
          subtotal: parseFloat(item.subtotal) || 0
        })) || [],
        payments: orderData.payments?.map(p => ({
          method: p.method,
          amount: parseFloat(p.amount) || 0,
          status: p.status
        })) || []
      };
    });

    // Calculate summary statistics
    const totalRevenue = detailedOrders.reduce((sum, o) => sum + o.total, 0);
    const totalOrders = detailedOrders.length;
    const totalItems = detailedOrders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const avgPrepTime = detailedOrders.filter(o => o.preparationTimeMinutes > 0).reduce((sum, o) => sum + o.preparationTimeMinutes, 0) /
      (detailedOrders.filter(o => o.preparationTimeMinutes > 0).length || 1);

    res.json({
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString(),
        startFormatted: start.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        endFormatted: end.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      },
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalOrders,
        totalItems,
        avgOrderValue: Math.round(avgOrderValue * 100) / 100,
        avgPreparationTime: Math.round(avgPrepTime)
      },
      orders: detailedOrders
    });
  } catch (error) {
    console.error('Detailed report error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get order by ID
router.get("/api/orders/:id", verifyToken, async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [
        {
          model: OrderItem,
          as: 'items'
        },
        {
          model: Payment,
          as: 'payments'
        },
        {
          model: User,
          as: 'cashier',
          attributes: ['id', 'name']
        }
      ]
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update order status
router.put("/api/orders/:id/status", verifyToken, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'preparing', 'ready', 'completed', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const order = await Order.findByPk(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const oldStatus = order.status;
    order.status = status;
    // Set preparedById when kitchen staff starts preparing the order
    if (status === 'preparing' && !order.preparedById) {
      order.preparedById = req.user.id;
    }
    // Set completedAt timestamp only when status becomes 'completed'
    if (status === 'completed') {
      order.completedAt = new Date();
    }
    await order.save();

    // Log the status update
    await createLog({
      userId: req.user.id,
      userName: req.user.name || req.user.email,
      action: 'UPDATE_ORDER',
      module: 'orders',
      entityId: order.id,
      entityType: 'Order',
      description: `Order #${order.orderNumber} status changed from ${oldStatus} to ${status}`,
      changes: JSON.stringify({
        before: { status: oldStatus },
        after: { status: status, completedAt: status === 'completed' ? new Date().toISOString() : null }
      }),
      ipAddress: getClientIp(req),
      status: 'success'
    });

    res.json({
      message: 'Order status updated successfully',
      order
    });
  } catch (error) {
    // Log the error
    await createLog({
      userId: req.user?.id,
      userName: req.user?.name || req.user?.email || 'Unknown',
      action: 'UPDATE_ORDER',
      module: 'orders',
      entityId: req.params.id,
      entityType: 'Order',
      description: `Failed to update order status to ${req.body.status}`,
      ipAddress: getClientIp(req),
      status: 'failed',
      errorMessage: error.message
    });
    res.status(500).json({ error: error.message });
  }
});

// ========== KITCHEN DISPLAY API ==========

// Get orders by assigned categories for kitchen staff
// Get incoming orders filtered by assigned categories (kitchen display)
router.post("/api/kitchen/orders/incoming", verifyToken, async (req, res) => {
  try {
    const { assignedCategories } = req.body;

    const orders = await Order.findAll({
      where: {
        status: { [sequelize.Sequelize.Op.ne]: 'completed' }
      },
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [
            {
              model: MenuItem,
              as: 'menuItem',
              attributes: ['id', 'name', 'categoryId', 'sizes', 'flavors', 'hasSize', 'hasFlavor'],
              include: [
                {
                  model: MenuCategory,
                  as: 'category',
                  attributes: ['id', 'name']
                }
              ]
            }
          ]
        },
        {
          model: Payment,
          as: 'payments'
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Filter orders to only include those with items in assigned categories
    const filteredOrders = orders.filter(order => {
      if (!assignedCategories || assignedCategories.length === 0) {
        return true; // If no categories assigned, show all orders
      }

      return order.items.some(item =>
        item.menuItem && assignedCategories.includes(item.menuItem.categoryId)
      );
    });

    res.json({ orders: filteredOrders || [] });
  } catch (error) {
    console.error('Error fetching incoming orders:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get completed orders filtered by assigned categories (kitchen display)
router.post("/api/kitchen/orders/completed", verifyToken, async (req, res) => {
  try {
    const { assignedCategories } = req.body;

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const orders = await Order.findAll({
      where: {
        status: 'completed',
        // Use completedAt to determine orders completed today (created earlier but finished today should be included)
        completedAt: {
          [sequelize.Sequelize.Op.gte]: today,
          [sequelize.Sequelize.Op.lt]: tomorrow
        }
      },
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [
            {
              model: MenuItem,
              as: 'menuItem',
              attributes: ['id', 'name', 'categoryId', 'sizes', 'flavors', 'hasSize', 'hasFlavor'],
              include: [
                {
                  model: MenuCategory,
                  as: 'category',
                  attributes: ['id', 'name']
                }
              ]
            }
          ]
        },
        {
          model: Payment,
          as: 'payments'
        }
      ],
      order: [['completedAt', 'ASC']]
    });

    // Filter orders to only include those with items in assigned categories
    const filteredOrders = orders.filter(order => {
      if (!assignedCategories || assignedCategories.length === 0) {
        return true; // If no categories assigned, show all orders
      }

      return order.items.some(item =>
        item.menuItem && assignedCategories.includes(item.menuItem.categoryId)
      );
    });

    res.json({ orders: filteredOrders || [] });
  } catch (error) {
    console.error('Error fetching completed orders:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== PAYMENTS API ==========

// Create payment (usually done with order creation)
router.post("/api/payments", verifyToken, async (req, res) => {
  try {
    const { orderId, method, amount, amountReceived, change } = req.body;

    if (!orderId || !method || !amount) {
      return res.status(400).json({ error: 'Order ID, method, and amount required' });
    }

    const payment = await Payment.create({
      orderId,
      method,
      amount,
      amountReceived,
      change,
      status: 'completed'
    });

    res.status(201).json({
      message: 'Payment created successfully',
      payment
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== LOGS API ==========

// Get all logs with optional filtering
router.get("/api/logs", verifyToken, async (req, res) => {
  try {
    const { action, module, userId, entityType, status, limit = 50, offset = 0 } = req.query;

    const filters = {};
    if (action) filters.action = action;
    if (module) filters.module = module;
    if (userId) filters.userId = userId;
    if (entityType) filters.entityType = entityType;
    if (status) filters.status = status;

    const { logs, total } = await getLogs(filters, parseInt(limit), parseInt(offset));

    res.json({
      message: 'Logs retrieved successfully',
      logs,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get logs for a specific entity
router.get("/api/logs/entity/:entityType/:entityId", verifyToken, async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const logs = await Log.findAll({
      where: { entityType, entityId: parseInt(entityId) },
      order: [['createdAt', 'DESC']],
      limit: 100
    });

    res.json({
      message: 'Entity logs retrieved successfully',
      logs
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get logs for a specific user
router.get("/api/logs/user/:userId", verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const logs = await Log.findAll({
      where: { userId: parseInt(userId) },
      order: [['createdAt', 'DESC']],
      limit: 100
    });

    res.json({
      message: 'User logs retrieved successfully',
      logs
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== QR KEY MANAGEMENT ==========

// In-memory active QR key (persists until server restart)
let activeQrKey = null;

// Generate new QR key (protected - admin only)
router.post("/api/qr-key/generate", verifyToken, async (req, res) => {
  try {
    // Generate a random 8-char key
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = '';
    for (let i = 0; i < 8; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    activeQrKey = key;
    console.log(`🔑 New QR key generated: ${key}`);
    res.json({ message: 'New QR key generated', key: activeQrKey });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get active QR key (protected)
router.get("/api/qr-key/active", verifyToken, async (req, res) => {
  try {
    res.json({ key: activeQrKey });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Validate QR key (public - used by feedback page)
router.get("/api/qr-key/validate/:key", async (req, res) => {
  try {
    const { key } = req.params;
    const valid = activeQrKey !== null && key === activeQrKey;
    res.json({ valid });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== FEEDBACK API ==========

// Helper function to get themes based on rating
const getRatingThemes = (rating) => {
  const themesMap = {
    1: ['Service Issues', 'Quality Problems', 'Major Complaints'],
    2: ['Poor Quality', 'Service Concerns', 'Needs Improvement'],
    3: ['Acceptable Service', 'Standard Quality', 'Basic Requirements Met'],
    4: ['Excellent Service', 'High Quality', 'Positive Experience'],
    5: ['Outstanding Service', 'Premium Quality', 'Exceptional Experience']
  };
  return themesMap[rating] || ['General Feedback'];
};

// Helper function to get rating-based feedback message
const getRatingFeedback = (rating) => {
  const feedbackMap = {
    1: 'Poor experience - significant issues encountered',
    2: 'Below expectations - multiple problems noted',
    3: 'Acceptable service - met basic requirements',
    4: 'Good experience - exceeded expectations',
    5: 'Excellent - outstanding service and quality'
  };
  return feedbackMap[rating] || 'Customer feedback received';
};

// Helper function to get praises based on rating
const getRatingPraises = (rating) => {
  if (rating >= 4) {
    return rating === 5
      ? ['excellent', 'outstanding', 'outstanding service']
      : ['good', 'satisfied', 'positive experience'];
  }
  return [];
};

// Helper function to get issues based on rating
const getRatingIssues = (rating) => {
  if (rating <= 2) {
    return rating === 1
      ? ['poor quality', 'major issues', 'unsatisfactory']
      : ['problems', 'disappointing', 'below standard'];
  }
  return [];
};

// Submit feedback (no authentication required for QR code scans)
router.post("/api/feedback/submit", async (req, res) => {
  try {
    const { orderNumber, rating, tags, comment, googleFormResponseId } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    if (!orderNumber || !orderNumber.trim()) {
      return res.status(400).json({ error: 'Order number is required' });
    }

    // Strip MM-DD- date prefix if present (feedback form adds it for security)
    // e.g., "03-30-ORD-12345678" → "ORD-12345678"
    const actualOrderNumber = orderNumber.replace(/^\d{2}-\d{2}-/, '');

    // Validate that the order exists in the system
    const order = await Order.findOne({ where: { orderNumber: actualOrderNumber } });
    if (!order) {
      return res.status(400).json({ error: 'Order not found. Please check your order number and try again.' });
    }

    // Check if feedback already exists for this order (one feedback per receipt)
    const existingFeedback = await Feedback.findOne({ where: { orderId: order.id } });
    if (existingFeedback) {
      return res.status(400).json({ error: 'Feedback already submitted for this order' });
    }

    const orderId = order.id;

    // Analyze sentiment based on rating and comment
    let sentiment = 'neutral';
    let themes = [];
    let aiAnalysis = null;

    // If there's a comment, analyze it for themes and details
    if (comment && comment.trim().length > 0) {
      const analysis = analyzeWithKeywords(comment);
      themes = getRatingThemes(rating);

      // Combine rating and comment sentiment for final determination
      // Rating weight: 60%, Comment weight: 40%
      let ratingScore = rating <= 2 ? -1 : (rating >= 4 ? 1 : 0);
      let commentScore = analysis.sentiment === 'negative' ? -1 : (analysis.sentiment === 'positive' ? 1 : 0);
      let combinedScore = (ratingScore * 0.6) + (commentScore * 0.4);

      if (combinedScore > 0.2) sentiment = 'positive';
      else if (combinedScore < -0.2) sentiment = 'negative';
      else sentiment = 'neutral';

      // If rating and comment conflict, mark as mixed
      if ((rating <= 2 && analysis.sentiment === 'positive') || (rating >= 4 && analysis.sentiment === 'negative')) {
        sentiment = 'mixed';
      }

      aiAnalysis = analysis;
      aiAnalysis.sentiment = sentiment;
      aiAnalysis.ratingFeedback = getRatingFeedback(rating);
      aiAnalysis.keyPraises = getRatingPraises(rating);
      aiAnalysis.keyIssues = getRatingIssues(rating);
    } else {
      // No comment - determine sentiment from rating only: 1-2 stars = negative, 3 = neutral, 4-5 = positive
      if (rating <= 2) sentiment = 'negative';
      else if (rating >= 4) sentiment = 'positive';
      else sentiment = 'neutral';

      // Even without comment, create AI analysis based on rating
      aiAnalysis = {
        source: 'rating',
        sentiment: sentiment,
        themes: getRatingThemes(rating),
        summary: getRatingFeedback(rating),
        keyPraises: getRatingPraises(rating),
        keyIssues: getRatingIssues(rating),
        ratingFeedback: getRatingFeedback(rating)
      };
      themes = getRatingThemes(rating);
    }

    const feedback = await Feedback.create({
      orderId,
      orderNumber,
      rating: parseInt(rating),
      tags: tags || [],
      comment: comment || null,
      source: googleFormResponseId ? 'google_form' : 'qr_code',
      googleFormResponseId,
      status: 'pending',
      sentiment,
      themes,
      aiAnalysis
    });

    res.status(201).json({
      message: 'Feedback submitted successfully',
      feedback
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get feedback analytics (protected)
router.get("/api/feedback/analytics", verifyToken, async (req, res) => {
  try {
    const { startDate, endDate, limit = 100 } = req.query;

    let whereClause = {};
    if (startDate || endDate) {
      const { Op } = sequelize.Sequelize;
      whereClause.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        whereClause.createdAt[Op.gte] = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        whereClause.createdAt[Op.lte] = end;
      }
    }

    const allFeedback = await Feedback.findAll({
      where: whereClause,
      attributes: ['id', 'rating', 'sentiment', 'themes', 'comment', 'orderNumber', 'createdAt', 'processed'],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      raw: true
    });

    if (allFeedback.length === 0) {
      return res.json({
        summary: {
          totalFeedback: 0,
          overallScore: 0,
          ratingDistribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
          sentimentCount: { positive: 0, neutral: 0, negative: 0 }
        },
        topThemes: [],
        recentFeedback: []
      });
    }

    const totalRating = allFeedback.reduce((sum, f) => sum + (f.rating || 0), 0);
    const overallScore = allFeedback.length > 0 ? (totalRating / allFeedback.length).toFixed(2) : 0;

    const ratingDistribution = {
      '1': allFeedback.filter(f => f.rating === 1).length,
      '2': allFeedback.filter(f => f.rating === 2).length,
      '3': allFeedback.filter(f => f.rating === 3).length,
      '4': allFeedback.filter(f => f.rating === 4).length,
      '5': allFeedback.filter(f => f.rating === 5).length,
    };

    const sentimentCount = {
      positive: allFeedback.filter(f => f.sentiment === 'positive').length,
      neutral: allFeedback.filter(f => f.sentiment === 'neutral').length,
      negative: allFeedback.filter(f => f.sentiment === 'negative').length,
    };

    const themeMap = {};
    allFeedback.forEach(feedback => {
      let themes = feedback.themes;
      if (typeof themes === 'string') {
        try { themes = JSON.parse(themes); } catch (e) { themes = []; }
      }
      if (themes && Array.isArray(themes)) {
        themes.forEach(theme => {
          themeMap[theme] = (themeMap[theme] || 0) + 1;
        });
      }
    });

    const topThemes = Object.entries(themeMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([theme, count]) => ({
        theme,
        count,
        percentage: ((count / allFeedback.length) * 100).toFixed(1)
      }));

    res.json({
      summary: {
        totalFeedback: allFeedback.length,
        overallScore: parseFloat(overallScore),
        ratingDistribution,
        sentimentCount
      },
      topThemes,
      recentFeedback: allFeedback.slice(0, 10)
    });
  } catch (error) {
    console.error('Error in getFeedbackAnalytics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Export feedback with order details (protected)
router.get("/api/feedback/export", verifyToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const whereClause = {};
    if (startDate && endDate) {
      whereClause.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate + 'T23:59:59')]
      };
    }

    const feedbacks = await Feedback.findAll({
      where: whereClause,
      include: [
        {
          model: Order,
          as: 'order',
          attributes: ['id', 'orderNumber', 'customerName', 'total', 'createdAt'],
          include: [
            {
              model: OrderItem,
              as: 'items',
              attributes: ['name', 'quantity', 'price']
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    const formatDate = (dateStr) => {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    // Calculate stats
    const totalFeedbacks = feedbacks.length;
    const avgRating = totalFeedbacks > 0
      ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / totalFeedbacks).toFixed(1)
      : '0.0';
    const positiveCount = feedbacks.filter(f => f.sentiment === 'positive').length;
    const negativeCount = feedbacks.filter(f => f.sentiment === 'negative').length;
    const neutralCount = feedbacks.filter(f => f.sentiment === 'neutral' || f.sentiment === 'mixed').length;

    res.json({
      dateRange: {
        start: startDate,
        end: endDate,
        startFormatted: formatDate(startDate),
        endFormatted: formatDate(endDate)
      },
      summary: {
        totalFeedbacks,
        avgRating,
        positiveCount,
        negativeCount,
        neutralCount
      },
      feedbacks: feedbacks.map(f => ({
        id: f.id,
        orderNumber: f.orderNumber || (f.order?.orderNumber) || 'N/A',
        customerName: f.order?.customerName || 'Anonymous',
        rating: f.rating,
        sentiment: f.sentiment || 'neutral',
        comment: f.comment || '',
        items: f.order?.items?.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price
        })) || [],
        createdAt: f.createdAt
      }))
    });
  } catch (error) {
    console.error('Error exporting feedback:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all feedback (protected)
router.get("/api/feedback", verifyToken, async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    const whereClause = {};
    if (status && status !== 'all') {
      whereClause.status = status;
    }

    const feedback = await Feedback.findAll({
      where: whereClause,
      attributes: ['id', 'orderNumber', 'rating', 'comment', 'tags', 'sentiment', 'themes', 'status', 'createdAt', 'processed', 'aiAnalysis', 'source'],
      include: [
        {
          model: Order,
          as: 'order',
          attributes: ['id', 'orderNumber', 'customerName', 'total', 'createdAt'],
          include: [
            {
              model: OrderItem,
              as: 'items',
              attributes: ['name', 'quantity', 'price']
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const total = await Feedback.count({
      where: whereClause
    });

    res.json({
      feedback,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get feedback by ID (protected)
router.get("/api/feedback/:id", verifyToken, async (req, res) => {
  try {
    const feedback = await Feedback.findByPk(req.params.id, {
      include: [
        {
          model: Order,
          as: 'order',
          attributes: ['id', 'orderNumber', 'customerName', 'total', 'createdAt']
        }
      ]
    });

    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    res.json(feedback);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update feedback (protected)
router.put("/api/feedback/:id", verifyToken, async (req, res) => {
  try {
    const { status, processed, aiAnalysis, themes, sentiment } = req.body;
    const feedback = await Feedback.findByPk(req.params.id);

    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    if (status) feedback.status = status;
    if (processed !== undefined) feedback.processed = processed;
    if (aiAnalysis) feedback.aiAnalysis = aiAnalysis;
    if (themes) feedback.themes = themes;
    if (sentiment) feedback.sentiment = sentiment;

    await feedback.save();

    res.json({
      message: 'Feedback updated successfully',
      feedback
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete feedback (protected)
router.delete("/api/feedback/:id", verifyToken, async (req, res) => {
  try {
    const feedback = await Feedback.findByPk(req.params.id);

    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    await feedback.destroy();

    res.json({ message: 'Feedback deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== DISCOUNTS API ==========

// Get all discounts
router.get("/api/discounts", verifyToken, async (req, res) => {
  try {
    const discounts = await Discount.findAll({
      order: [['createdAt', 'DESC']]
    });
    res.json(discounts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create discount
router.post("/api/discounts", verifyToken, async (req, res) => {
  try {
    const { name, percentage } = req.body;

    if (!name || percentage === undefined || percentage === null) {
      return res.status(400).json({ error: 'Name and percentage are required' });
    }

    if (percentage < 0 || percentage > 100) {
      return res.status(400).json({ error: 'Percentage must be between 0 and 100' });
    }

    const discount = await Discount.create({ name, percentage });
    await createLog(req.user.id, 'create', 'discount', discount.id, req);

    res.status(201).json(discount);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'A discount with this name already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update discount
router.put("/api/discounts/:id", verifyToken, async (req, res) => {
  try {
    const discount = await Discount.findByPk(req.params.id);

    if (!discount) {
      return res.status(404).json({ error: 'Discount not found' });
    }

    const { name, percentage, enabled } = req.body;

    if (name !== undefined) {
      // Check if another discount already has this name
      const existing = await Discount.findOne({ where: { name, id: { [Op.ne]: req.params.id } } });
      if (existing) {
        return res.status(400).json({ error: 'A discount with this name already exists' });
      }
      discount.name = name;
    }

    if (percentage !== undefined) {
      if (percentage < 0 || percentage > 100) {
        return res.status(400).json({ error: 'Percentage must be between 0 and 100' });
      }
      discount.percentage = percentage;
    }

    if (enabled !== undefined) {
      discount.enabled = enabled;
    }

    await discount.save();
    await createLog(req.user.id, 'update', 'discount', discount.id, req);

    res.json(discount);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete discount
router.delete("/api/discounts/:id", verifyToken, async (req, res) => {
  try {
    const discount = await Discount.findByPk(req.params.id);

    if (!discount) {
      return res.status(404).json({ error: 'Discount not found' });
    }

    const id = discount.id;
    await discount.destroy();
    await createLog(req.user.id, 'delete', 'discount', id, req);

    res.json({ message: 'Discount deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== VOUCHERS API ==========

// Get all vouchers
router.get("/api/vouchers", verifyToken, async (req, res) => {
  try {
    const vouchers = await Voucher.findAll({
      order: [['createdAt', 'DESC']]
    });
    res.json(vouchers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create voucher (supports bulk creation with quantity)
router.post("/api/vouchers", verifyToken, async (req, res) => {
  try {
    const { name, amount, startDate, endDate, quantity = 1 } = req.body;

    if (!name || amount === undefined || amount === null || !startDate || !endDate) {
      return res.status(400).json({ error: 'Name, amount, start date, and end date are required' });
    }

    if (amount < 0) {
      return res.status(400).json({ error: 'Amount must be greater than or equal to 0' });
    }

    const qty = Math.min(Math.max(parseInt(quantity) || 1, 1), 1000); // Clamp between 1 and 1000

    // Generate function for unique codes
    const generateUniqueCode = async () => {
      let uniqueCode;
      let exists = true;
      let attempts = 0;

      while (exists && attempts < 100) {
        uniqueCode = Math.random().toString(36).substr(2, 9).toUpperCase();
        exists = await Voucher.findOne({ where: { code: uniqueCode } });
        attempts++;
      }

      if (attempts >= 100) {
        throw new Error('Failed to generate unique voucher code');
      }

      return uniqueCode;
    };

    const createdVouchers = [];

    // Create multiple vouchers with unique generated codes
    for (let i = 0; i < qty; i++) {
      const voucherCode = await generateUniqueCode();

      const voucher = await Voucher.create({
        name,
        code: voucherCode,
        amount,
        startDate,
        endDate,
        used: false
      });

      await createLog(req.user.id, 'create', 'voucher', voucher.id, req);
      createdVouchers.push(voucher);
    }

    // Return all created vouchers
    if (qty === 1) {
      res.status(201).json(createdVouchers[0]);
    } else {
      res.status(201).json({
        message: `Created ${qty} vouchers successfully`,
        count: createdVouchers.length,
        vouchers: createdVouchers
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update voucher
router.put("/api/vouchers/:id", verifyToken, async (req, res) => {
  try {
    const voucher = await Voucher.findByPk(req.params.id);

    if (!voucher) {
      return res.status(404).json({ error: 'Voucher not found' });
    }

    const { name, code, amount, enabled, startDate, endDate } = req.body;

    if (name !== undefined) {
      voucher.name = name;
    }

    if (code !== undefined) {
      // Check if another voucher already has this code
      const existing = await Voucher.findOne({ where: { code: code.toUpperCase(), id: { [Op.ne]: req.params.id } } });
      if (existing) {
        return res.status(400).json({ error: 'A voucher with this code already exists' });
      }
      voucher.code = code.toUpperCase();
    }

    if (amount !== undefined) {
      if (amount < 0) {
        return res.status(400).json({ error: 'Amount must be greater than or equal to 0' });
      }
      voucher.amount = amount;
    }

    if (enabled !== undefined) {
      voucher.enabled = enabled;
    }

    if (startDate !== undefined) {
      voucher.startDate = startDate;
    }

    if (endDate !== undefined) {
      voucher.endDate = endDate;
    }

    await voucher.save();
    await createLog(req.user.id, 'update', 'voucher', voucher.id, req);

    res.json(voucher);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete voucher
router.delete("/api/vouchers/:id", verifyToken, async (req, res) => {
  try {
    const voucher = await Voucher.findByPk(req.params.id);

    if (!voucher) {
      return res.status(404).json({ error: 'Voucher not found' });
    }

    const id = voucher.id;
    await voucher.destroy();
    await createLog(req.user.id, 'delete', 'voucher', id, req);

    res.json({ message: 'Voucher deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Redeem voucher (increment used count)
router.post("/api/vouchers/redeem", verifyToken, async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }

    const voucher = await Voucher.findOne({ where: { code: code.toUpperCase() } });

    if (!voucher) {
      return res.status(404).json({ error: 'Voucher not found' });
    }

    voucher.used += 1;
    await voucher.save();
    await createLog(req.user.id, 'redeem', 'voucher', voucher.id, req);

    res.json({ message: 'Voucher redeemed successfully', voucher });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== BUSINESS HOURS API ==========

// Get business hours (or create default if doesn't exist)
// Public endpoint so login page can fetch hours before authentication
router.get("/api/business-hours", async (req, res) => {
  try {
    let businessHours = await BusinessHours.findOne();

    // If no business hours record exists, create a default one
    if (!businessHours) {
      businessHours = await BusinessHours.create({
        openTime: "09:00:00",
        closeTime: "22:00:00",
        applyCashier: true,
        applyKitchen: true
      });
    }

    res.json(businessHours);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update business hours
router.put("/api/business-hours", verifyToken, async (req, res) => {
  try {
    const { openTime, closeTime, applyCashier, applyKitchen } = req.body;
    console.log('PUT /api/business-hours body:', req.body, 'user:', req.user?.id);

    // Convert HH:MM format to HH:MM:SS if needed
    const formatTime = (time) => {
      if (!time) return null;
      // If time is already HH:MM:SS format (contains 8 chars), return as is
      if (time.length === 8) return time;
      // If time is HH:MM format (5 chars), add :00 seconds
      if (time.length === 5) return time + ':00';
      return time;
    };

    let businessHours = await BusinessHours.findOne();

    // If no business hours record exists, create one
    if (!businessHours) {
      businessHours = await BusinessHours.create({
        openTime: formatTime(openTime) || "09:00:00",
        closeTime: formatTime(closeTime) || "22:00:00",
        applyCashier: applyCashier !== undefined ? applyCashier : true,
        applyKitchen: applyKitchen !== undefined ? applyKitchen : true
      });
    } else {
      // Update existing record
      if (openTime !== undefined) businessHours.openTime = formatTime(openTime);
      if (closeTime !== undefined) businessHours.closeTime = formatTime(closeTime);
      if (applyCashier !== undefined) businessHours.applyCashier = applyCashier;
      if (applyKitchen !== undefined) businessHours.applyKitchen = applyKitchen;

      await businessHours.save();
    }

    await createLog(req.user.id, 'update', 'business_hours', businessHours.id, req);

    res.json({ message: 'Business hours updated successfully', businessHours });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== PAYROLL ROUTES (sub-router, TD-04 fix) ==========
// Seed default config on first run (safe to call every time)
seedDefaultConfigs();

// Staff Attendance Clock-In/Out & Employee Payslips (accessible by all authenticated staff)
router.use('/api/employee', verifyToken, employeeRouter);
router.post('/api/attendance/clock-in', verifyToken, payrollController.clockIn);
router.post('/api/attendance/clock-out', verifyToken, payrollController.clockOut);

// Admin-facing payroll management (requires admin)
router.use('/api', verifyToken, requireAdmin, payrollRouter);

export default router;
