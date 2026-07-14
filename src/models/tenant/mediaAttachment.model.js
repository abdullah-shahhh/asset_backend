'use strict';

/** MediaAttachment (TENANT db) — photos/sketches linked to a survey asset (doc §6). */
module.exports = (sequelize, DataTypes) => {
  const MediaAttachment = sequelize.define(
    'MediaAttachment',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      networkAssetId: { type: DataTypes.UUID, allowNull: false, field: 'network_asset_id' },
      url: { type: DataTypes.STRING, allowNull: false },
      mimeType: { type: DataTypes.STRING, allowNull: true, field: 'mime_type' },
      sizeBytes: { type: DataTypes.INTEGER, allowNull: true, field: 'size_bytes' },
      uploadedByUserId: { type: DataTypes.UUID, allowNull: true, field: 'uploaded_by_user_id' },
    },
    {
      tableName: 'media_attachments',
      underscored: true,
      timestamps: true,
      indexes: [{ fields: ['network_asset_id'] }],
    }
  );

  MediaAttachment.associate = (models) => {
    MediaAttachment.belongsTo(models.NetworkAsset, { foreignKey: 'networkAssetId', as: 'networkAsset' });
  };

  return MediaAttachment;
};
