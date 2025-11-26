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
    type: DataTypes.ENUM('cashier', 'kitchen'), 
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
    references: {
      model: KitchenStation,
      key: 'id'
    }
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
  }
});

// Define association
Employee.belongsTo(KitchenStation, { 
  foreignKey: 'assignedStationId',
  as: 'station'
});

export { sequelize };
