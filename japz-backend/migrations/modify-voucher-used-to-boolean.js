import { sequelize } from "../models/db.js";

export const modifyVoucherUsedToBoolean = async () => {
  try {
    const queryInterface = sequelize.getQueryInterface();
    
    // Check if the vouchers table exists
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('vouchers')) {
      console.log('Vouchers table does not exist, skipping migration');
      return;
    }

    // Modify the 'used' column from INTEGER to BOOLEAN
    await queryInterface.changeColumn('vouchers', 'used', {
      type: sequelize.Sequelize.DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    console.log('Successfully migrated voucher used field to BOOLEAN');
  } catch (error) {
    console.error('Migration error:', error.message);
    // Don't throw - this allows the app to continue even if migration fails
  }
};
