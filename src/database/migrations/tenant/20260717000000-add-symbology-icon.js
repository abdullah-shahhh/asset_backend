'use strict';

/**
 * Adds symbologies.icon — an optional icon identifier a manager picks when
 * building a Point symbology (from a fixed, curated icon set the client
 * chooses from; Line/Polygon symbologies leave this null). Purely cosmetic,
 * used to render field submissions as recognisable icons on the map instead
 * of plain dots.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('symbologies', 'icon', {
      type: Sequelize.DataTypes.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('symbologies', 'icon');
  },
};
