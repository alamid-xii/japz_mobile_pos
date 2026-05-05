import { sequelize } from "./models/db.js";
import { BusinessHours } from "./models/businessHoursModel.js";

async function checkBusinessHours() {
  try {
    await sequelize.authenticate();
    console.log("✅ Connected to database\n");

    const hours = await BusinessHours.findAll();
    
    if (hours.length === 0) {
      console.log("❌ No business hours found in database!");
    } else {
      console.log("📅 Business Hours in Database:");
      hours.forEach(h => {
        console.log(`\n  Open Time: ${h.openTime}`);
        console.log(`  Close Time: ${h.closeTime}`);
        console.log(`  Apply to Cashier: ${h.applyCashier}`);
        console.log(`  Apply to Kitchen: ${h.applyKitchen}`);
      });
    }

    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

checkBusinessHours();
