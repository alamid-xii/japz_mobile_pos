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
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
      comment: 'Photo for this item; falls back to a category image when null',
    },
    featured: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: "Staff pick shown in the storefront hero; separate from the sales-derived best-seller badge",
    },
    featuredLabel: {
      type: DataTypes.STRING(40),
      allowNull: true,
      defaultValue: null,
      comment: "Badge wording for a featured item, e.g. 'Today's Pick'",
    },
    addonForCategoryIds: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
      comment: 'For Add-ons items only: which menu categories this extra may be offered with. null = offer everywhere.',
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
    hasTemperature: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    temperatures: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: ['Hot', 'Cold'],
    },
    status: {
      type: DataTypes.ENUM('available', 'unavailable'),
      defaultValue: 'available',
      allowNull: false,
    },
    inventoryMode: { type: DataTypes.ENUM('prepared', 'recipe'), allowNull: false, defaultValue: 'prepared' },
    reservedStock: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    reorderLevel: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 10 },
    trackStock: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
    stock: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    defaultStock: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    lastStockReset: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      defaultValue: null,
    },
    archived: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
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
