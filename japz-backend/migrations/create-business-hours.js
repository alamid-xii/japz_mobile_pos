'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('business_hours', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      openTime: {
        type: Sequelize.TIME,
        allowNull: false,
        defaultValue: '09:00:00'
      },
      closeTime: {
        type: Sequelize.TIME,
        allowNull: false,
        defaultValue: '22:00:00'
      },
      applyCashier: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      applyKitchen: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('business_hours');
  }
};
