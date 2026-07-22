'use strict';

const { NETWORK_ASSET_STATUS } = require('../../config/constants');

/**
 * NetworkAsset (TENANT db) — a generic geospatial asset (point, line, or
 * polygon) drawn against a manager-defined Symbology, with JSON attributes
 * (doc §6). `geom` is a plain PostGIS `geometry` column (no subtype
 * constraint) so a single table can hold Point, LineString, and Polygon rows
 * — the row's `geometryType` records which (mirrors `symbology.geometryType`
 * at creation time). Always written as GeoJSON with SRID 4326 (WGS84, what
 * GPS/web maps use).
 */
module.exports = (sequelize, DataTypes) => {
  const NetworkAsset = sequelize.define(
    'NetworkAsset',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      projectId: { type: DataTypes.UUID, allowNull: false, field: 'project_id' },
      // References Module.id in the MAIN db (cross-database — validated at the
      // service layer, not via a DB foreign key). Legacy: nullable now that
      // assets are created against a symbology instead of a module asset type.
      moduleId: { type: DataTypes.UUID, allowNull: true, field: 'module_id' },
      assetType: { type: DataTypes.STRING, allowNull: false, field: 'asset_type' }, // symbology key, e.g. 'fire_hydrant'
      symbologyId: { type: DataTypes.UUID, allowNull: true, field: 'symbology_id' },
      geometryType: { type: DataTypes.STRING, allowNull: false, field: 'geometry_type' }, // 'Point' | 'LineString' | 'Polygon'
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
      // Native equipment health — independent of `status` above (the
      // review/approval workflow state). Only settable when the asset's
      // symbology is flagged is_equipment (see networkAsset.service.js#update).
      operationalStatus: { type: DataTypes.STRING(20), allowNull: true, field: 'operational_status' },
      // IPAM-lite: only meaningful when symbology.isEquipment (same gate as operationalStatus).
      ipAddress: { type: DataTypes.STRING(45), allowNull: true, field: 'ip_address' },
    },
    {
      tableName: 'network_assets',
      underscored: true,
      timestamps: true,
      paranoid: true,
      indexes: [
        { fields: ['project_id'] },
        { fields: ['module_id'] },
        { fields: ['symbology_id'] },
        { fields: ['status'] },
        { fields: ['asset_type'] },
      ],
    }
  );

  NetworkAsset.associate = (models) => {
    NetworkAsset.belongsTo(models.Project, { foreignKey: 'projectId', as: 'project' });
    NetworkAsset.belongsTo(models.Symbology, { foreignKey: 'symbologyId', as: 'symbology' });
    NetworkAsset.belongsTo(models.User, { foreignKey: 'createdByUserId', as: 'createdBy' });
    NetworkAsset.belongsTo(models.User, { foreignKey: 'reviewedByUserId', as: 'reviewedBy' });
    NetworkAsset.hasMany(models.MediaAttachment, { foreignKey: 'networkAssetId', as: 'media' });
    NetworkAsset.hasMany(models.NetworkConnection, { foreignKey: 'fromAssetId', as: 'outgoingConnections' });
    NetworkAsset.hasMany(models.NetworkConnection, { foreignKey: 'toAssetId', as: 'incomingConnections' });
  };

  return NetworkAsset;
};
