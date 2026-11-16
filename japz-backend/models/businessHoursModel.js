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
    gcashNumber: {
      type: DataTypes.STRING(32),
      allowNull: true,
      defaultValue: null,
      comment: 'Where customers send GCash transfers. Null hides the option.',
    },
    gcashName: {
      type: DataTypes.STRING(120),
      allowNull: true,
      defaultValue: null,
    },
    storeLat: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true,
      defaultValue: null,
      comment: "The restaurant's latitude, used to draw the delivery line",
    },
    storeLng: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true,
      defaultValue: null,
      comment: "The restaurant's longitude, used to draw the delivery line",
    },
    deliveryEtaMinMinutes: {
      type: DataTypes.INTEGER,
      defaultValue: 30,
      allowNull: false,
      comment: 'Lower bound of the delivery estimate shown to customers',
    },
    deliveryEtaMaxMinutes: {
      type: DataTypes.INTEGER,
      defaultValue: 45,
      allowNull: false,
      comment: 'Upper bound of the delivery estimate shown to customers',
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
