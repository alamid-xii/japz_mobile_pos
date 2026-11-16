import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

export const CustomerAddress = sequelize.define(
  "CustomerAddress",
  {
    userId: { type: DataTypes.INTEGER, allowNull: false },
    label: { type: DataTypes.STRING(64), allowNull: true, defaultValue: null },
    address: { type: DataTypes.TEXT, allowNull: false },
    // Optional pin. An address with no coordinates is still perfectly usable.
    lat: { type: DataTypes.DECIMAL(10, 7), allowNull: true, defaultValue: null },
    lng: { type: DataTypes.DECIMAL(10, 7), allowNull: true, defaultValue: null },
    isDefault: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    lastUsedAt: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
  },
  { tableName: "customer_addresses", timestamps: true },
);

export { sequelize };
