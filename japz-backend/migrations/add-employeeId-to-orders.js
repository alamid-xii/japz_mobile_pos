import { DataTypes } from "sequelize";

export const up = async (sequelize) => {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    // Check if column already exists
    const tableDescription = await queryInterface.describeTable('Orders');
    
    if (!tableDescription.employeeId) {
      await queryInterface.addColumn('Orders', 'employeeId', {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'Employees',
          key: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });
      console.log('✓ Added employeeId column to Orders table');
    } else {
      console.log('! employeeId column already exists in Orders table');
    }
  } catch (error) {
    console.error('Error in up migration:', error);
    throw error;
  }
};

export const down = async (sequelize) => {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    const tableDescription = await queryInterface.describeTable('Orders');
    
    if (tableDescription.employeeId) {
      await queryInterface.removeColumn('Orders', 'employeeId');
      console.log('✓ Removed employeeId column from Orders table');
    }
  } catch (error) {
    console.error('Error in down migration:', error);
    throw error;
  }
};
