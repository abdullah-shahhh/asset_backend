'use strict';

/**
 * Adds symbologies.icon_url — lets a manager upload their own custom icon
 * image for a Point symbology instead of picking from the curated set. When
 * present it takes precedence over `icon` for rendering; the two are kept
 * mutually exclusive at the service layer (setting one clears the other).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('symbologies', 'icon_url', {
      type: Sequelize.DataTypes.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('symbologies', 'icon_url');
  },
};
