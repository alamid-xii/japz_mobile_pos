import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

export const Payroll = sequelize.define("Payroll", {
  employeeId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  periodStart: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  periodEnd: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  totalHours: {
    type: DataTypes.DECIMAL(7, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  grossPay: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  deductions: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  netPay: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  status: {
    type: DataTypes.ENUM('pending', 'paid'),
    defaultValue: 'pending',
    allowNull: false
  }
});
