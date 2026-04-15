import { DataTypes } from 'sequelize';

export async function up(sequelize) {
  const transaction = await sequelize.transaction();
  try {
    await sequelize.getQueryInterface().addColumn(
      'menu_items',
      'archived',
      {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
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
    await sequelize.getQueryInterface().removeColumn('menu_items', 'archived', { transaction });
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
