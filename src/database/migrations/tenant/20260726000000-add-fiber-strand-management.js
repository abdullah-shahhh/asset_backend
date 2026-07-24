'use strict';

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

    await queryInterface.addColumn('symbologies', 'is_cable', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.createTable('fiber_strands', {
      id: uuidPk,
      network_asset_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'network_assets', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      strand_number: { type: DataTypes.INTEGER, allowNull: false },
      tube_number: { type: DataTypes.INTEGER, allowNull: false },
      color: { type: DataTypes.STRING(20), allowNull: false },
      status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'available' },
      role: { type: DataTypes.STRING(20), allowNull: true },
      assigned_customer_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'customers', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      notes: { type: DataTypes.TEXT, allowNull: true },
      ...ts,
    });
    await queryInterface.addIndex('fiber_strands', ['network_asset_id']);
    await queryInterface.addIndex('fiber_strands', ['assigned_customer_id']);
    await queryInterface.addIndex('fiber_strands', ['network_asset_id', 'strand_number'], { unique: true });

    await queryInterface.createTable('equipment_ports', {
      id: uuidPk,
      network_asset_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'network_assets', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      port_number: { type: DataTypes.INTEGER, allowNull: false },
      status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'free' },
      notes: { type: DataTypes.TEXT, allowNull: true },
      ...ts,
    });
    await queryInterface.addIndex('equipment_ports', ['network_asset_id']);
    await queryInterface.addIndex('equipment_ports', ['network_asset_id', 'port_number'], { unique: true });

    await queryInterface.createTable('fiber_splices', {
      id: uuidPk,
      project_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'projects', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      splice_asset_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'network_assets', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      end_a_type: { type: DataTypes.STRING(10), allowNull: false },
      end_a_strand_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'fiber_strands', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      end_a_strand_side: { type: DataTypes.STRING(1), allowNull: true },
      end_a_port_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'equipment_ports', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      end_b_type: { type: DataTypes.STRING(10), allowNull: false },
      end_b_strand_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'fiber_strands', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      end_b_strand_side: { type: DataTypes.STRING(1), allowNull: true },
      end_b_port_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'equipment_ports', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      notes: { type: DataTypes.STRING(255), allowNull: true },
      ...ts,
    });
    await queryInterface.addIndex('fiber_splices', ['project_id']);
    await queryInterface.addIndex('fiber_splices', ['end_a_strand_id']);
    await queryInterface.addIndex('fiber_splices', ['end_b_strand_id']);
    await queryInterface.addIndex('fiber_splices', ['end_a_port_id']);
    await queryInterface.addIndex('fiber_splices', ['end_b_port_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('fiber_splices');
    await queryInterface.dropTable('equipment_ports');
    await queryInterface.dropTable('fiber_strands');
    await queryInterface.removeColumn('symbologies', 'is_cable');
  },
};
