import { sequelize } from "./models/db.js";
import { BusinessHours } from "./models/businessHoursModel.js";

async function fixBusinessHours() {
  try {
    await sequelize.authenticate();
    console.log("✅ Connected to database\n");

    const hours = await BusinessHours.findOne();
    
    if (hours) {
      await hours.update({
        openTime: '09:00:00',
        closeTime: '22:00:00',
        applyCashier: true,
        applyKitchen: true
      });
      
      console.log("✅ Business hours updated!");
      console.log(`  Open Time: ${hours.openTime}`);
      console.log(`  Close Time: ${hours.closeTime}`);
      console.log(`  Apply to Cashier: ${hours.applyCashier}`);
      console.log(`  Apply to Kitchen: ${hours.applyKitchen}`);
    } else {
      console.log("❌ No business hours found!");
    }

    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

fixBusinessHours();
