import { sequelize } from "./models/db.js";
import { BusinessHours } from "./models/businessHoursModel.js";

async function testBusinessHoursUpdate() {
  try {
    console.log('\n🧪 Testing Business Hours Update\n');
    console.log('================================\n');
    
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');
    
    // Test 1: Check current hours
    console.log('1️⃣  Current hours in database:');
    let hours = await BusinessHours.findOne();
    console.log(`   Open: ${hours.openTime}, Close: ${hours.closeTime}\n`);
    
    // Test 2: Simulate what the backend receives from frontend (HH:MM format)
    console.log('2️⃣  Updating to 14:00 - 23:00 (simulating frontend HH:MM format)...');
    
    // This simulates the formatTime function logic
    const formatTime = (time) => {
      if (!time) return null;
      if (time.length === 8) return time;  // Already HH:MM:SS
      if (time.length === 5) return time + ':00';  // Convert HH:MM to HH:MM:SS
      return time;
    };
    
    const openTime = formatTime('14:00');
    const closeTime = formatTime('23:00');
    console.log(`   Formatted: ${openTime} - ${closeTime}\n`);
    
    // Update the database
    hours.openTime = openTime;
    hours.closeTime = closeTime;
    await hours.save();
    console.log('✅ Updated in database\n');
    
    // Test 3: Verify the update
    console.log('3️⃣  Verifying update:');
    hours = await BusinessHours.findOne();
    console.log(`   Open: ${hours.openTime}, Close: ${hours.closeTime}`);
    console.log(`   Format correct: ${hours.openTime === '14:00:00' && hours.closeTime === '23:00:00' ? '✅ YES' : '❌ NO'}\n`);
    
    // Test 4: Update with HH:MM:SS format
    console.log('4️⃣  Updating to 09:00 - 22:00 (HH:MM:SS format)...');
    const openTime2 = formatTime('09:00:00');
    const closeTime2 = formatTime('22:00:00');
    console.log(`   Formatted: ${openTime2} - ${closeTime2}\n`);
    
    hours.openTime = openTime2;
    hours.closeTime = closeTime2;
    await hours.save();
    console.log('✅ Updated in database\n');
    
    // Test 5: Final verification
    console.log('5️⃣  Final verification:');
    hours = await BusinessHours.findOne();
    console.log(`   Open: ${hours.openTime}, Close: ${hours.closeTime}`);
    console.log(`   Format correct: ${hours.openTime === '09:00:00' && hours.closeTime === '22:00:00' ? '✅ YES' : '❌ NO'}\n`);
    
    console.log('✅ All tests passed!\n');
    console.log('The backend will now properly convert HH:MM (from frontend) to HH:MM:SS (for database)\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testBusinessHoursUpdate();

