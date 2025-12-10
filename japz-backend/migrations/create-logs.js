import { DataTypes } from "sequelize";

export const up = async (sequelize) => {
  const queryInterface = sequelize.getQueryInterface();

  try {
    // Check if Logs table already exists
    const tableExists = await queryInterface.showAllTables();
    if (tableExists.includes('Logs')) {
      console.log('! Logs table already exists');
      return;
    }

    await queryInterface.createTable('Logs', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      userName: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      action: {
        type: DataTypes.ENUM(
          'CREATE_ORDER',
          'UPDATE_ORDER',
          'DELETE_ORDER',
          'CREATE_EMPLOYEE',
          'UPDATE_EMPLOYEE',
          'DELETE_EMPLOYEE',
          'CREATE_MENU_ITEM',
          'UPDATE_MENU_ITEM',
          'DELETE_MENU_ITEM',
          'CREATE_MENU_CATEGORY',
          'UPDATE_MENU_CATEGORY',
          'DELETE_MENU_CATEGORY',
          'LOGIN',
          'LOGOUT',
          'UPDATE_PASSWORD',
          'UPDATE_PROFILE',
          'ASSIGN_STATION',
          'ASSIGN_CATEGORIES',
          'OTHER'
        ),
        allowNull: false,
      },
      module: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      entityId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      entityType: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      changes: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      ipAddress: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('success', 'failed', 'pending'),
        defaultValue: 'success',
      },
      errorMessage: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    }, {
      indexes: [
        { fields: ['userId'] },
        { fields: ['action'] },
        { fields: ['module'] },
        { fields: ['entityType', 'entityId'] },
        { fields: ['createdAt'] }
      ]
    });

    console.log('✓ Logs table created successfully');
  } catch (error) {
    console.error('Error in up migration:', error);
    throw error;
  }
};

export const down = async (sequelize) => {
  const queryInterface = sequelize.getQueryInterface();

  try {
    const tableExists = await queryInterface.showAllTables();
    if (tableExists.includes('Logs')) {
      await queryInterface.dropTable('Logs');
      console.log('✓ Logs table dropped successfully');
    }
  } catch (error) {
    console.error('Error in down migration:', error);
    throw error;
  }
};
