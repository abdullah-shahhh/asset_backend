'use strict';

/** Customer (TENANT db) — Salesforce-lite. Optionally linked to a service
 * asset (e.g. the ONT that serves them). */
module.exports = (sequelize, DataTypes) => {
  const Customer = sequelize.define(
    'Customer',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      name: { type: DataTypes.STRING, allowNull: false },
      email: { type: DataTypes.STRING, allowNull: true },
      phone: { type: DataTypes.STRING, allowNull: true },
      address: { type: DataTypes.STRING, allowNull: true },
      networkAssetId: { type: DataTypes.UUID, allowNull: true, field: 'network_asset_id' },
    },
    {
      tableName: 'customers',
      underscored: true,
      timestamps: true,
      indexes: [{ fields: ['network_asset_id'] }],
    }
  );

  Customer.associate = (models) => {
    Customer.belongsTo(models.NetworkAsset, { foreignKey: 'networkAssetId', as: 'asset' });
    Customer.hasMany(models.Ticket, { foreignKey: 'customerId', as: 'tickets' });
  };

  return Customer;
};
