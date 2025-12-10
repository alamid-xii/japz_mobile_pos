

import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
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
import { analyzeWithKeywords } from "../services/gemmaService.js";

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

// ========== API ENDPOINTS FOR MOBILE APP ==========

// Register
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

    // Create user (defaults to 'admin' role)
    const user = await User.create({ name, email, password: hashed });

    res.status(201).json({
      message: 'Registration successful',
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
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

    // Try to find user in User table first
    let user = await User.findOne({ where: { email } });

    // If not found in User table, check Employee table
    if (!user) {
      user = await Employee.findOne({ where: { email } });
      if (!user) {
        await createLog({
          action: 'LOGIN',
          module: 'auth',
          description: `Login attempt for non-existent user: ${email}`,
          ipAddress,
          status: 'failed',
          errorMessage: 'User not found'
        });
        return res.status(401).json({ error: 'User not found' });
      }
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
      return res.status(401).json({ error: 'Incorrect password' });
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

// Get current user (protected route)
router.get("/api/auth/user", verifyToken, async (req, res) => {
  try {
    // Try to find in User table first
    let user = await User.findByPk(req.user.id);
    if (!user) {
      // If not found, check Employee table
      user = await Employee.findByPk(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
    }
    res.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
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

    // Find user (try User table first, then Employee)
    let user = await User.findByPk(req.user.id);
    if (!user) {
      user = await Employee.findByPk(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
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

// ========== EMPLOYEES API ==========

// Get all employees
router.get("/api/employees", verifyToken, async (req, res) => {
  try {
    const employees = await Employee.findAll({
      include: [
        {
          model: KitchenStation,
          as: 'station',
          attributes: ['id', 'name', 'category'],
          required: false
        }
      ]
    });
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create employee
router.post("/api/employees", verifyToken, async (req, res) => {
  try {
    const { name, email, phone, password, role, assignedStationId, assignedCategories, joinDate } = req.body;

    // Validation
    if (!name || !email || !phone || !password || !role) {
      return res.status(400).json({ error: 'All fields required' });
    }

    // Check if employee exists
    const existingEmployee = await Employee.findOne({ where: { email } });
    if (existingEmployee) {
      await createLog({
        userId: req.user.id,
        userName: req.user.name,
        action: 'CREATE_EMPLOYEE',
        module: 'employees',
        description: `Attempted to create employee with duplicate email: ${email}`,
        ipAddress: getClientIp(req),
        status: 'failed',
        errorMessage: 'Email already in use'
      });
      return res.status(400).json({ error: 'Email already in use' });
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    // Create employee
    const employee = await Employee.create({
      name,
      email,
      phone,
      password: hashed,
      role,
      assignedStationId: role === 'kitchen' ? assignedStationId : null,
      assignedCategories: role === 'kitchen' && assignedCategories ? assignedCategories : null,
      joinDate: joinDate || new Date().toISOString().split('T')[0],
      status: 'active'
    });

    // Log employee creation
    await createLog({
      userId: req.user.id,
      userName: req.user.name,
      action: 'CREATE_EMPLOYEE',
      module: 'employees',
      entityId: employee.id,
      entityType: 'Employee',
      description: `Employee created: ${name} (${email}) with role ${role}`,
      changes: {
        name,
        email,
        role,
        phone
      },
      ipAddress: getClientIp(req),
      status: 'success'
    });

    // Fetch with station info
    const result = await Employee.findByPk(employee.id, {
      include: [
        {
          model: KitchenStation,
          as: 'station',
          attributes: ['id', 'name', 'category'],
          required: false
        }
      ]
    });

    res.status(201).json({
      message: 'Employee created successfully',
      employee: result
    });
  } catch (error) {
    await createLog({
      userId: req.user.id,
      userName: req.user.name,
      action: 'CREATE_EMPLOYEE',
      module: 'employees',
      description: 'Error creating employee',
      ipAddress: getClientIp(req),
      status: 'failed',
      errorMessage: error.message
    });
    res.status(500).json({ error: error.message });
  }
});

// Get employee by ID
router.get("/api/employees/:id", verifyToken, async (req, res) => {
  try {
    const employee = await Employee.findByPk(req.params.id, {
      include: [
        {
          model: KitchenStation,
          as: 'station',
          attributes: ['id', 'name', 'category'],
          required: false
        }
      ]
    });
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json(employee);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update employee
router.put("/api/employees/:id", verifyToken, async (req, res) => {
  try {
    const { name, email, phone, role, assignedStationId, assignedCategories, status, password } = req.body;
    const employee = await Employee.findByPk(req.params.id);

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    if (name) employee.name = name;
    if (email) employee.email = email;
    if (phone) employee.phone = phone;
    if (role) employee.role = role;
    if (status) employee.status = status;

    // Handle password update if provided
    if (password && password.trim()) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      employee.password = hashedPassword;
    }

    if (role === 'kitchen') {
      employee.assignedStationId = assignedStationId;
      if (assignedCategories !== undefined) {
        employee.assignedCategories = assignedCategories;
      }
    } else {
      employee.assignedStationId = null;
      employee.assignedCategories = null;
    }

    await employee.save();

    const result = await Employee.findByPk(employee.id, {
      include: [
        {
          model: KitchenStation,
          as: 'station',
          attributes: ['id', 'name', 'category'],
          required: false
        }
      ]
    });

    res.json({
      message: 'Employee updated successfully',
      employee: result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete employee
router.delete("/api/employees/:id", verifyToken, async (req, res) => {
  try {
    const employee = await Employee.findByPk(req.params.id);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    await employee.destroy();
    res.json({ message: 'Employee deleted successfully' });
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
      order: [['createdAt', 'DESC']]
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
router.get("/api/menu-items", async (req, res) => {
  try {
    const items = await MenuItem.findAll({
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

// Get menu items by category
router.get("/api/menu-items/category/:categoryId", async (req, res) => {
  try {
    const items = await MenuItem.findAll({
      where: { categoryId: req.params.categoryId },
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
    const { name, categoryId, price, description, hasSize, sizes, hasFlavor, flavors } = req.body;

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
    const { name, categoryId, price, description, status, hasSize, sizes, hasFlavor, flavors } = req.body;
    const item = await MenuItem.findByPk(req.params.id);

    if (!item) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    const oldCategoryId = item.categoryId;

    if (name) item.name = name;
    if (price) item.price = price;
    if (description !== undefined) item.description = description;
    if (status) item.status = status;
    if (hasSize !== undefined) item.hasSize = hasSize;
    if (sizes !== undefined) item.sizes = sizes;
    if (hasFlavor !== undefined) item.hasFlavor = hasFlavor;
    if (flavors !== undefined) item.flavors = flavors;

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

// ========== ORDERS API ==========

// Create order
router.post("/api/orders", verifyToken, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { orderNumber, cashierId, cashier, subtotal, discount, total, payment, items, status, createdAt, customerName, orderType, tableNumber, notes } = req.body;

    if (!orderNumber || !total || !items || !payment) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Order number, total, items, and payment required' });
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
        createdAt: {
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
      order: [['completedAt', 'DESC']]
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

    // Try to find order by order number
    let orderId = null;
    if (orderNumber) {
      const order = await Order.findOne({ where: { orderNumber } });
      if (order) {
        orderId = order.id;
      }
    }

    // Analyze sentiment based on rating and comment
    let sentiment = 'neutral';
    let themes = [];
    let aiAnalysis = null;

    // Determine sentiment from rating: 1-2 stars = negative, 3-5 stars = positive
    if (rating <= 2) {
      sentiment = 'negative';
    } else if (rating >= 3) {
      sentiment = 'positive';
    }

    // If there's a comment, analyze it for themes and details
    if (comment && comment.trim().length > 0) {
      const analysis = analyzeWithKeywords(comment);
      themes = getRatingThemes(rating);
      aiAnalysis = analysis;
      aiAnalysis.sentiment = sentiment;
      aiAnalysis.ratingFeedback = getRatingFeedback(rating);
      aiAnalysis.keyPraises = getRatingPraises(rating);
      aiAnalysis.keyIssues = getRatingIssues(rating);
    } else {
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
          attributes: ['id', 'orderNumber', 'customerName', 'total', 'createdAt']
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

export default router;