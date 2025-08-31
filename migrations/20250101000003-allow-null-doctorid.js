'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Modify the doctorId column to allow NULL values
    await queryInterface.changeColumn('appointments', 'doctorId', {
      type: Sequelize.INTEGER,
      allowNull: true, // Allow NULL for virtual appointments
      references: {
        model: 'Doctors',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Revert back to not allowing NULL
    await queryInterface.changeColumn('appointments', 'doctorId', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'Doctors',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  }
};
