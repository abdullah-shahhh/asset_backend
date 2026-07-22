'use strict';

/**
 * Native "is my equipment online" status — separate from the review/approval
 * status assets already have. Symbologies get an is_equipment flag (org
 * admins decide which of their types are real equipment, e.g. a Fiber
 * Distribution Hub vs. a passive Handhole); equipment assets get an
 * operational_status.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;

    await queryInterface.addColumn('symbologies', 'is_equipment', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.addColumn('network_assets', 'operational_status', {
      type: DataTypes.STRING(20),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('network_assets', 'operational_status');
    await queryInterface.removeColumn('symbologies', 'is_equipment');
  },
};
