'use strict';

const { NETWORK_ASSET_STATUS } = require('../../config/constants');

/**
 * NetworkAsset (TENANT db) — a generic geospatial asset (point or line) with
 * a module_id and JSON attributes (doc §6). `geom` is a plain PostGIS
 * `geometry` column (no subtype constraint) so a single table can hold both
 * Point assets (poles, splice closures, manholes, ONTs) and LineString assets
 * (cable segments) — the row's `geometryType` records which. Always written
 * as GeoJSON with SRID 4326 (WGS84, what GPS/web maps use).
 */
module.exports = (sequelize, DataTypes) => {
  const NetworkAsset = sequelize.define(
    'NetworkAsset',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      projectId: { type: DataTypes.UUID, allowNull: false, field: 'project_id' },
      // References Module.id in the MAIN db (cross-database — validated at the
      // service layer, not via a DB foreign key).
      moduleId: { type: DataTypes.UUID, allowNull: false, field: 'module_id' },
      assetType: { type: DataTypes.STRING, allowNull: false, field: 'asset_type' }, // e.g. 'cable_segment'
      geometryType: { type: DataTypes.STRING, allowNull: false, field: 'geometry_type' }, // 'Point' | 'LineString'
      geom: { type: DataTypes.GEOMETRY, allowNull: false },
      attributes: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      status: {
        type: DataTypes.ENUM(...Object.values(NETWORK_ASSET_STATUS)),
        allowNull: false,
        defaultValue: NETWORK_ASSET_STATUS.PENDING,
      },
      createdByUserId: { type: DataTypes.UUID, allowNull: true, field: 'created_by_user_id' },
      reviewedByUserId: { type: DataTypes.UUID, allowNull: true, field: 'reviewed_by_user_id' },
      reviewedAt: { type: DataTypes.DATE, allowNull: true, field: 'reviewed_at' },
      rejectionReason: { type: DataTypes.STRING, allowNull: true, field: 'rejection_reason' },
    },
    {
      tableName: 'network_assets',
      underscored: true,
      timestamps: true,
      paranoid: true,
      indexes: [
        { fields: ['project_id'] },
        { fields: ['module_id'] },
        { fields: ['status'] },
        { fields: ['asset_type'] },
      ],
    }
  );

  NetworkAsset.associate = (models) => {
    NetworkAsset.belongsTo(models.Project, { foreignKey: 'projectId', as: 'project' });
    NetworkAsset.belongsTo(models.User, { foreignKey: 'createdByUserId', as: 'createdBy' });
    NetworkAsset.belongsTo(models.User, { foreignKey: 'reviewedByUserId', as: 'reviewedBy' });
    NetworkAsset.hasMany(models.MediaAttachment, { foreignKey: 'networkAssetId', as: 'media' });
  };

  return NetworkAsset;
};
