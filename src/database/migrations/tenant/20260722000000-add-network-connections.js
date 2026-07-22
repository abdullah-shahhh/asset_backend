'use strict';

/**
 * network_connections — a directed edge between two NetworkAssets (e.g. "this
 * cable terminates at this splice closure"). This is the first piece of an
 * actual connectivity graph on top of what was previously just independently
 * geo-tagged shapes; it doesn't change how assets are drawn, submitted, or
 * reviewed.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;

    const uuidPk = {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
    };
    const ts = {
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    };

    await queryInterface.createTable('network_connections', {
      id: uuidPk,
      project_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'projects', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      from_asset_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'network_assets', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      to_asset_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'network_assets', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      label: { type: DataTypes.STRING(100), allowNull: true },
      ...ts,
    });

    await queryInterface.addIndex('network_connections', ['project_id']);
    await queryInterface.addIndex('network_connections', ['from_asset_id']);
    await queryInterface.addIndex('network_connections', ['to_asset_id']);

    await queryInterface.sequelize.query(
      'ALTER TABLE network_connections ADD CONSTRAINT network_connections_no_self_link CHECK (from_asset_id <> to_asset_id);'
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('network_connections');
  },
};
