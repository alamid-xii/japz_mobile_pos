export async function up(sequelize) {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    await queryInterface.addColumn('vouchers', 'startDate', {
      type: sequelize.Sequelize.DataTypes.DATE,
      allowNull: true,
    });
    console.log('✓ Added startDate column to vouchers');
  } catch (error) {
    if (!error.message.includes('Duplicate')) {
      console.log('✓ startDate column already exists in vouchers');
    }
  }

  try {
    await queryInterface.addColumn('vouchers', 'endDate', {
      type: sequelize.Sequelize.DataTypes.DATE,
      allowNull: true,
    });
    console.log('✓ Added endDate column to vouchers');
  } catch (error) {
    if (!error.message.includes('Duplicate')) {
      console.log('✓ endDate column already exists in vouchers');
    }
  }
}

export async function down(sequelize) {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    await queryInterface.removeColumn('vouchers', 'startDate');
    await queryInterface.removeColumn('vouchers', 'endDate');
  } catch (error) {
    console.log('Error rolling back voucher columns:', error.message);
  }
}
