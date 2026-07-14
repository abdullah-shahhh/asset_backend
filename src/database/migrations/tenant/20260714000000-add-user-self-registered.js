'use strict';

/**
 * Adds users.is_self_registered — distinguishes a surveyor who signed up
 * themselves via the org join code (pending admin approval) from a user an
 * admin added directly (active immediately).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'is_self_registered', {
      type: Sequelize.DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'is_self_registered');
  },
};
