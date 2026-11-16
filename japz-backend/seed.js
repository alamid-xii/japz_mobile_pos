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

import { sequelize } from "./models/db.js";
import { User } from "./models/userModel.js";
import { Employee } from "./models/employeeModel.js";
import { BusinessHours } from "./models/businessHoursModel.js";
import bcrypt from "bcrypt";

async function seed() {
  try {
    await sequelize.authenticate();
    console.log("✅ Connected to MySQL database!");

    // Check if admin already exists
    const existingAdmin = await User.findOne({ where: { email: 'admin@gmail.com' } });
    const existingCashier = await User.findOne({ where: { email: 'allaimanimtim06@gmail.com' } });
    const existingKitchen = await User.findOne({ where: { email: 'felipcoz04@gmail.com' } });
    
    if (existingAdmin && existingCashier && existingKitchen) {
      console.log("ℹ️  All accounts already exist. Skipping seed.");
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('password', 10);

    // Create admin user if not exists
    if (!existingAdmin) {
      await User.create({
        name: 'Admin',
        email: 'admin@gmail.com',
        password: hashedPassword,
        role: 'admin',
        status: 'approved'
      });
      console.log("✅ Admin account created successfully!");
      console.log("📧 Email: admin@gmail.com");
      console.log("🔑 Password: password");
    }

    // Create cashier user if not exists
    if (!existingCashier) {
      await User.create({
        name: 'Cashier',
        email: 'allaimanimtim06@gmail.com',
        password: hashedPassword,
        role: 'cashier',
        status: 'approved'
      });
      console.log("✅ Cashier account created successfully!");
      console.log("📧 Email: allaimanimtim06@gmail.com");
      console.log("🔑 Password: password");
    }

    // Create kitchen user if not exists
    if (!existingKitchen) {
      await User.create({
        name: 'Kitchen',
        email: 'felipcoz04@gmail.com',
        password: hashedPassword,
        role: 'kitchen',
        status: 'approved'
      });
      console.log("✅ Kitchen account created successfully!");
      console.log("📧 Email: felipcoz04@gmail.com");
      console.log("🔑 Password: password");
    }

    // Create default business hours if not exists
    const existingBusinessHours = await BusinessHours.findOne();
    if (!existingBusinessHours) {
      await BusinessHours.create({
        openTime: '09:00:00',
        closeTime: '22:00:00',
        applyCashier: true,
        applyKitchen: true
      });
      console.log("✅ Default business hours created (09:00 - 22:00)!");
    }
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    throw err;
  }
}

export { seed };

import { fileURLToPath } from 'url';

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seed().finally(() => process.exit());
}
