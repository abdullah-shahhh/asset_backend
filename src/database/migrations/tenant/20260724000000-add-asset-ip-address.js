'use strict';

/** IPAM-lite: equipment assets get an IP address, native to the platform
 * (no external IPAM system connected). Same isEquipment gate already used
 * for operational_status. */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;
    await queryInterface.addColumn('network_assets', 'ip_address', {
      type: DataTypes.STRING(45),
      allowNull: true,
    });
    await queryInterface.addIndex('network_assets', ['ip_address']);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('network_assets', ['ip_address']);
    await queryInterface.removeColumn('network_assets', 'ip_address');
  },
};
