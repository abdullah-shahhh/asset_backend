'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;
    await queryInterface.addColumn('symbologies', 'line_width', {
      type: DataTypes.FLOAT,
      allowNull: false,
      // Matches the previous hardcoded cable line width so existing
      // symbologies keep their current on-map appearance until edited.
      defaultValue: 5,
    });
    await queryInterface.addColumn('symbologies', 'dash_array', {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('symbologies', 'line_width');
    await queryInterface.removeColumn('symbologies', 'dash_array');
  },
};
