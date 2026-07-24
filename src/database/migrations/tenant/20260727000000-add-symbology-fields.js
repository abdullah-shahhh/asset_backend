'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;
    await queryInterface.addColumn('symbologies', 'fields', {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('symbologies', 'fields');
  },
};
