import { sequelize } from "./models/db.js";
import { User } from "./models/userModel.js";
import bcrypt from "bcrypt";

async function addAccounts() {
  try {
    await sequelize.authenticate();
    console.log("✅ Connected to database");

    const hashedPassword = await bcrypt.hash('password', 10);

    // Create cashier account
    const cashier = await User.findOrCreate({
      where: { email: 'allaimanimtim06@gmail.com' },
      defaults: {
        name: 'Cashier',
        email: 'allaimanimtim06@gmail.com',
        password: hashedPassword,
        role: 'cashier',
        status: 'approved'
      }
    });

    if (cashier[1]) {
      console.log("✅ Cashier account created!");
      console.log("📧 Email: allaimanimtim06@gmail.com");
      console.log("🔑 Password: password");
    } else {
      console.log("ℹ️  Cashier account already exists");
    }

    // Create kitchen account
    const kitchen = await User.findOrCreate({
      where: { email: 'felipcoz04@gmail.com' },
      defaults: {
        name: 'Kitchen',
        email: 'felipcoz04@gmail.com',
        password: hashedPassword,
        role: 'kitchen',
        status: 'approved'
      }
    });

    if (kitchen[1]) {
      console.log("✅ Kitchen account created!");
      console.log("📧 Email: felipcoz04@gmail.com");
      console.log("🔑 Password: password");
    } else {
      console.log("ℹ️  Kitchen account already exists");
    }

    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

addAccounts();
