'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Orders', 'orderType', {
      type: Sequelize.ENUM('dine-in', 'take-out', 'delivery'),
      allowNull: true,
      defaultValue: null,
    });

    await queryInterface.addColumn('Orders', 'tableNumber', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: null,
    });

    await queryInterface.addColumn('Orders', 'notes', {
      type: Sequelize.TEXT,
      allowNull: true,
      defaultValue: null,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Orders', 'orderType');
    await queryInterface.removeColumn('Orders', 'tableNumber');
    await queryInterface.removeColumn('Orders', 'notes');
  }
};
