import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sequelize } from "../models/db.js";
import { homePage } from "../controllers/homeController.js";
import { loginPage, registerPage, forgotPasswordPage, dashboardPage, loginUser, registerUser, logoutUser } from "../controllers/authController.js";
import { submitFeedback, getFeedbackAnalytics, getAllFeedback, getFeedbackById, updateFeedback, deleteFeedback } from "../controllers/feedbackController.js";
import { User } from "../models/userModel.js";
import { Employee } from "../models/employeeModel.js";
import { KitchenStation } from "../models/kitchenStationModel.js";
import { MenuCategory } from "../models/menuCategoryModel.js";
import { MenuItem } from "../models/menuItemModel.js";
import { Order } from "../models/orderModel.js";
import { OrderItem } from "../models/orderItemModel.js";
import { Payment } from "../models/paymentModel.js";
import { Feedback } from "../models/feedbackModel.js";
import { 
  syncGoogleFormResponses, 
  getSyncStatistics, 
  validateGoogleSheetsConnection,
  triggerGoogleFormSync 
} from "../services/googleSheetsService.js";

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
router.get("/feedback", (req, res) => {
  const orderNumber = req.query.order || null;
  res.render('feedback', { orderNumber });
});

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

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Try to find user in User table first
    let user = await User.findOne({ where: { email } });
    
    // If not found in User table, check Employee table
    if (!user) {
      user = await Employee.findOne({ where: { email } });
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }
    }

    // Compare password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    // Create JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Logout (client-side, just removes token from storage)
router.post("/api/auth/logout", (req, res) => {
  res.json({ message: 'Logout successful' });
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
    const { name, email, phone, role, assignedStationId, assignedCategories, status } = req.body;
    const employee = await Employee.findByPk(req.params.id);

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    if (name) employee.name = name;
    if (phone) employee.phone = phone;
    if (role) employee.role = role;
    if (status) employee.status = status;
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
    const { orderNumber, cashierId, cashier, subtotal, discount, total, payment, items, status, createdAt, customerName } = req.body;

    if (!orderNumber || !total || !items || !payment) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Order number, total, items, and payment required' });
    }

    // Create order
    const order = await Order.create({
      orderNumber,
      cashierId: cashierId || req.user.id,
      customerName,
      subtotal: parseFloat(subtotal || total),
      discount: parseFloat(discount || 0),
      total: parseFloat(total),
      status: status || 'completed'
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

// ========== CASHIER-SPECIFIC ENDPOINTS ==========

// Get active orders for cashier (optimized - no heavy associations)
router.get("/api/cashier/orders/active", verifyToken, async (req, res) => {
  try {
    // Only cashier and admin can access
    if (req.user.role !== 'cashier' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Cashier access required' });
    }

    // Get only active orders (not completed)
    const orders = await Order.findAll({
      where: {
        status: ['pending', 'preparing', 'ready']
      },
      include: [
        {
          model: OrderItem,
          as: 'items',
          attributes: ['id', 'menuItemId', 'name', 'quantity', 'price', 'total', 'modifiers']
        }
      ],
      attributes: ['id', 'orderNumber', 'customerName', 'status', 'total', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: 50,
      raw: false
    });

    res.json({
      success: true,
      count: orders.length,
      orders: orders.map(o => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName || 'Walk-in Customer',
        status: o.status,
        total: parseFloat(o.total),
        createdAt: o.createdAt,
        items: o.items.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: parseFloat(item.price),
          total: parseFloat(item.total),
          modifiers: item.modifiers
        }))
      }))
    });
  } catch (error) {
    console.error('Error fetching active orders:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get order by ID for cashier
router.get("/api/cashier/orders/:id", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'cashier' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Cashier access required' });
    }

    const order = await Order.findByPk(req.params.id, {
      include: [
        {
          model: OrderItem,
          as: 'items'
        },
        {
          model: Payment,
          as: 'payments'
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

    order.status = status;
    await order.save();

    res.json({
      message: 'Order status updated successfully',
      order
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== KITCHEN DISPLAY SYSTEM (KDS) API ==========

// Get incoming orders for kitchen display
router.post("/api/kitchen/orders/incoming", verifyToken, async (req, res) => {
  try {
    // Only kitchen staff can access
    if (req.user.role !== 'kitchen') {
      return res.status(403).json({ error: 'Kitchen staff access required' });
    }

    const orders = await Order.findAll({
      where: {
        status: ['pending', 'preparing', 'ready']
      },
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [
            {
              model: MenuItem,
              as: 'menuItem',
              attributes: ['id', 'name', 'hasSize', 'hasFlavor', 'sizes', 'flavors']
            }
          ]
        }
      ],
      order: [['createdAt', 'ASC']], // FIFO - oldest first
      limit: 50
    });

    res.json({
      success: true,
      count: orders.length,
      orders: orders.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        totalAmount: order.total,
        createdAt: order.createdAt,
        items: order.items.map(item => ({
          id: item.id,
          name: item.menuItem?.name || item.name,
          quantity: item.quantity,
          total: item.total,
          modifiers: item.modifiers,
          menuItem: item.menuItem
        }))
      }))
    });
  } catch (error) {
    console.error('Error fetching incoming orders:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get completed orders for kitchen display
router.post("/api/kitchen/orders/completed", verifyToken, async (req, res) => {
  try {
    // Only kitchen staff can access
    if (req.user.role !== 'kitchen') {
      return res.status(403).json({ error: 'Kitchen staff access required' });
    }

    const orders = await Order.findAll({
      where: {
        status: 'completed'
      },
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [
            {
              model: MenuItem,
              as: 'menuItem',
              attributes: ['id', 'name']
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']], // Most recent first
      limit: 20
    });

    res.json({
      success: true,
      count: orders.length,
      orders: orders.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        totalAmount: order.total,
        createdAt: order.createdAt,
        items: order.items.map(item => ({
          id: item.id,
          name: item.menuItem?.name || item.name,
          quantity: item.quantity,
          total: item.total,
          modifiers: item.modifiers
        }))
      }))
    });
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

// ========== FEEDBACK API ==========

// Submit feedback (no authentication required for QR code scans)
router.post("/api/feedback/submit", async (req, res) => {
  return submitFeedback(req, res);
});

// Get feedback analytics (protected)
router.get("/api/feedback/analytics", verifyToken, async (req, res) => {
  return getFeedbackAnalytics(req, res);
});

// Get all feedback (protected)
router.get("/api/feedback", verifyToken, async (req, res) => {
  return getAllFeedback(req, res);
});

// Get feedback by ID (protected)
router.get("/api/feedback/:id", verifyToken, async (req, res) => {
  return getFeedbackById(req, res);
});

// Update feedback (protected)
router.put("/api/feedback/:id", verifyToken, async (req, res) => {
  return updateFeedback(req, res);
});

// Delete feedback (protected)
router.delete("/api/feedback/:id", verifyToken, async (req, res) => {
  return deleteFeedback(req, res);
});

// ========== GOOGLE FORMS SYNC API (Admin Only) ==========

// Manually trigger Google Forms sync (admin endpoint)
router.post("/api/admin/google-forms/sync", verifyToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    console.log(`🔐 Admin triggered manual sync at ${new Date().toLocaleTimeString()}`);
    const result = await triggerGoogleFormSync();

    res.json({
      message: 'Google Forms sync triggered successfully',
      result: {
        totalProcessed: result.total,
        created: result.created,
        skipped: result.skipped,
        errors: result.errors
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Google Forms sync statistics
router.get("/api/admin/google-forms/stats", verifyToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const stats = await getSyncStatistics();

    res.json({
      statistics: stats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Validate Google Sheets API connection
router.get("/api/admin/google-forms/validate", verifyToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const validation = await validateGoogleSheetsConnection();

    if (validation.valid) {
      res.json({
        status: 'connected',
        connection: validation
      });
    } else {
      res.status(400).json({
        status: 'error',
        error: validation.error
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get detailed feedback sources breakdown
router.get("/api/admin/feedback/sources", verifyToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const googleFormCount = await Feedback.count({
      where: { source: 'google_form' }
    });

    const directCount = await Feedback.count({
      where: { source: 'direct' }
    });

    const qrCodeCount = await Feedback.count({
      where: { source: 'qr_code' }
    });

    const processedCount = await Feedback.count({
      where: { processed: true }
    });

    const pendingCount = await Feedback.count({
      where: { processed: false }
    });

    res.json({
      sources: {
        googleForm: {
          count: googleFormCount,
          percentage: ((googleFormCount / (googleFormCount + directCount + qrCodeCount)) * 100 || 0).toFixed(1)
        },
        direct: {
          count: directCount,
          percentage: ((directCount / (googleFormCount + directCount + qrCodeCount)) * 100 || 0).toFixed(1)
        },
        qrCode: {
          count: qrCodeCount,
          percentage: ((qrCodeCount / (googleFormCount + directCount + qrCodeCount)) * 100 || 0).toFixed(1)
        }
      },
      processing: {
        processed: processedCount,
        pending: pendingCount,
        total: googleFormCount + directCount + qrCodeCount
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;