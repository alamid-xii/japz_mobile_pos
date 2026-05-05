import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

export const BusinessHours = sequelize.define(
  "BusinessHours",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    openTime: {
      type: DataTypes.TIME,
      allowNull: false,
      defaultValue: "09:00:00",
    },
    closeTime: {
      type: DataTypes.TIME,
      allowNull: false,
      defaultValue: "22:00:00",
    },
    applyCashier: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
    applyKitchen: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
  },
  {
    tableName: "business_hours",
    timestamps: true,
  }
);
