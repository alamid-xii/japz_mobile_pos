import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

export const KitchenStation = sequelize.define("KitchenStation", {
  name: { 
    type: DataTypes.STRING, 
    allowNull: false,
    unique: true
  },
  category: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active',
    allowNull: false
  }
});

export { sequelize };
