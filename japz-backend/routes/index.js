

import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { homePage } from "../controllers/homeController.js";
import { loginPage, registerPage, forgotPasswordPage, dashboardPage, loginUser, registerUser, logoutUser } from "../controllers/authController.js";
import { User } from "../models/userModel.js";
import { Employee } from "../models/employeeModel.js";
import { KitchenStation } from "../models/kitchenStationModel.js";
import { MenuCategory } from "../models/menuCategoryModel.js";
import { MenuItem } from "../models/menuItemModel.js";

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
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
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

export default router;