export async function up(sequelize) {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    await queryInterface.addColumn('discounts', 'startDate', {
      type: sequelize.Sequelize.DataTypes.DATE,
      allowNull: true,
    });
    console.log('✓ Added startDate column to discounts');
  } catch (error) {
    if (!error.message.includes('Duplicate')) {
      console.log('✓ startDate column already exists in discounts');
    }
  }

  try {
    await queryInterface.addColumn('discounts', 'endDate', {
      type: sequelize.Sequelize.DataTypes.DATE,
      allowNull: true,
    });
    console.log('✓ Added endDate column to discounts');
  } catch (error) {
    if (!error.message.includes('Duplicate')) {
      console.log('✓ endDate column already exists in discounts');
    }
  }
}

export async function down(sequelize) {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    await queryInterface.removeColumn('discounts', 'startDate');
    await queryInterface.removeColumn('discounts', 'endDate');
  } catch (error) {
    console.log('Error rolling back discount columns:', error.message);
  }
}
