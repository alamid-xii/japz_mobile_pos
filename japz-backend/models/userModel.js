

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

export const User = sequelize.define("User", {
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM('admin', 'cashier', 'kitchen', 'customer', 'rider'), defaultValue: 'cashier', allowNull: false },
  status: { type: DataTypes.ENUM('pending', 'approved', 'rejected', 'inactive'), defaultValue: 'pending', allowNull: false },
  phone: { type: DataTypes.STRING, allowNull: true, defaultValue: null }, // storefront customers and riders
  // Riders only. Drives who the cashier may assign a delivery to.
  availability: { type: DataTypes.ENUM('available', 'on-delivery', 'offline', 'inactive'), defaultValue: 'offline', allowNull: false },
  // Payroll. Set by the admin; 0 until then, so an unrated employee produces a
  // zero payslip rather than a guessed one.
  payType: { type: DataTypes.ENUM('hourly', 'monthly'), defaultValue: 'hourly', allowNull: false },
  payRate: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0, allowNull: false },
  assignedCategories: { type: DataTypes.JSON, defaultValue: [], allowNull: true } // For kitchen staff - array of category IDs
});
export { sequelize }; 
