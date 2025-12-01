import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";
import { MenuCategory } from "./menuCategoryModel.js";

export const MenuItem = sequelize.define(
  "MenuItem",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'menu_categories',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    hasSize: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    sizes: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    hasFlavor: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    flavors: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('available', 'unavailable'),
      defaultValue: 'available',
      allowNull: false,
    },
  },
  {
    tableName: "menu_items",
    timestamps: true,
  }
);

MenuCategory.hasMany(MenuItem, {
  foreignKey: 'categoryId',
  as: 'items',
});
