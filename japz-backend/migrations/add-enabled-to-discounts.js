import { DataTypes } from 'sequelize';

export async function up(sequelize) {
  const transaction = await sequelize.transaction();
  try {
    await sequelize.getQueryInterface().addColumn(
      'discounts',
      'enabled',
      {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false,
      },
      { transaction }
    );
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function down(sequelize) {
  const transaction = await sequelize.transaction();
  try {
    await sequelize.getQueryInterface().removeColumn('discounts', 'enabled', { transaction });
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
