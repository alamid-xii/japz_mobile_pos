import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";
import { KitchenStation } from "./kitchenStationModel.js";

export const Employee = sequelize.define("Employee", {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('admin', 'cashier', 'kitchen', 'rider', 'inventory'),
    allowNull: false,
    defaultValue: 'cashier'
  },
  joinDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  assignedStationId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  assignedCategories: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: null
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active',
    allowNull: false
  },
  hourlyRate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  dailyAllowance: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  monthlyAllowance: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  overtimeAllowed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  sssExempt: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  philhealthExempt: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  pagibigExempt: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  taxExempt: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  customDeduction: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  }
});

export { sequelize };
