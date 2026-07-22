'use strict';

/**
 * Salesforce-lite: customer records (optionally linked to a service asset,
 * e.g. an ONT) and support tickets against a customer. Native to the
 * platform — no CRM integration.
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

    await queryInterface.createTable('customers', {
      id: uuidPk,
      name: { type: DataTypes.STRING, allowNull: false },
      email: { type: DataTypes.STRING, allowNull: true },
      phone: { type: DataTypes.STRING, allowNull: true },
      address: { type: DataTypes.STRING, allowNull: true },
      network_asset_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'network_assets', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      ...ts,
    });
    await queryInterface.addIndex('customers', ['network_asset_id']);

    await queryInterface.createTable('tickets', {
      id: uuidPk,
      customer_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'customers', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      subject: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'open' },
      priority: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'medium' },
      ...ts,
    });
    await queryInterface.addIndex('tickets', ['customer_id']);
    await queryInterface.addIndex('tickets', ['status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('tickets');
    await queryInterface.dropTable('customers');
  },
};
