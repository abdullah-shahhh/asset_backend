'use strict';

/** NetworkConnection (TENANT db) — a directed edge between two NetworkAssets,
 * e.g. "this cable terminates at this splice closure". */
module.exports = (sequelize, DataTypes) => {
  const NetworkConnection = sequelize.define(
    'NetworkConnection',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      projectId: { type: DataTypes.UUID, allowNull: false, field: 'project_id' },
      fromAssetId: { type: DataTypes.UUID, allowNull: false, field: 'from_asset_id' },
      toAssetId: { type: DataTypes.UUID, allowNull: false, field: 'to_asset_id' },
      label: { type: DataTypes.STRING(100), allowNull: true },
    },
    {
      tableName: 'network_connections',
      underscored: true,
      timestamps: true,
      indexes: [{ fields: ['project_id'] }, { fields: ['from_asset_id'] }, { fields: ['to_asset_id'] }],
    }
  );

  NetworkConnection.associate = (models) => {
    NetworkConnection.belongsTo(models.Project, { foreignKey: 'projectId', as: 'project' });
    NetworkConnection.belongsTo(models.NetworkAsset, { foreignKey: 'fromAssetId', as: 'fromAsset' });
    NetworkConnection.belongsTo(models.NetworkAsset, { foreignKey: 'toAssetId', as: 'toAsset' });
  };

  return NetworkConnection;
};
