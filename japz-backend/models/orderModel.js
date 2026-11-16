/*
MIT License

Copyright (c) 2025 Christian I. Cabrera || XianFire Framework
Mindoro State University - Philippines

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

export const Order = sequelize.define("Order", {
  orderNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  cashierId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  preparedById: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Kitchen staff who prepared this order',
  },
  customerName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  customerUserId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
    comment: 'Storefront account that placed this order',
  },
  customerSeenStatus: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null,
    comment: 'Last order status the customer has acknowledged, for notifications',
  },
  customerPhone: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null,
    comment: 'Contact number for guest online orders',
  },
  source: {
    type: DataTypes.ENUM('pos', 'online'),
    allowNull: false,
    defaultValue: 'pos',
    comment: 'Where the order originated: in-store POS or customer self-service',
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  discount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  total: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  status: {
    type: DataTypes.ENUM('pending', 'preparing', 'ready', 'out-for-delivery', 'completed', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending',
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null,
  },
  orderType: {
    type: DataTypes.ENUM('dine-in', 'take-out', 'delivery'),
    allowNull: true,
    defaultValue: null,
  },
  tableNumber: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null,
  },
  deliveryAddress: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null,
  },
  deliveryAddressId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
    comment: 'Saved address this order was delivered to, if one was picked',
  },
  deliveryLat: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: true,
    defaultValue: null,
    comment: 'Customer-pinned latitude, captured at checkout',
  },
  deliveryLng: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: true,
    defaultValue: null,
    comment: 'Customer-pinned longitude, captured at checkout',
  },
  outForDeliveryAt: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null,
    comment: 'Dispatch time; the delivery estimate counts from here',
  },
  riderName: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null,
  },
  riderPhone: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null,
  },
});