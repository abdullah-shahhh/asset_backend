'use strict';

/** ShareLink (MAIN db) — a temporary, expiring, revocable read-only public
 * link into one project's map. See migration for why this lives in MAIN. */
module.exports = (sequelize, DataTypes) => {
  const ShareLink = sequelize.define(
    'ShareLink',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      organizationId: { type: DataTypes.UUID, allowNull: false, field: 'organization_id' },
      projectId: { type: DataTypes.UUID, allowNull: false, field: 'project_id' },
      token: { type: DataTypes.STRING(64), allowNull: false },
      createdByUserId: { type: DataTypes.UUID, allowNull: false, field: 'created_by_user_id' },
      label: { type: DataTypes.STRING, allowNull: true },
      // null = never expires ("forever, until I revoke it").
      expiresAt: { type: DataTypes.DATE, allowNull: true, field: 'expires_at' },
      revokedAt: { type: DataTypes.DATE, allowNull: true, field: 'revoked_at' },
      lastViewedAt: { type: DataTypes.DATE, allowNull: true, field: 'last_viewed_at' },
      viewCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'view_count' },
    },
    {
      tableName: 'share_links',
      underscored: true,
      timestamps: true,
    }
  );

  ShareLink.prototype.isActive = function isActive() {
    if (this.revokedAt) return false;
    if (!this.expiresAt) return true; // no expiry set
    return new Date(this.expiresAt) > new Date();
  };

  ShareLink.associate = (models) => {
    ShareLink.belongsTo(models.Organization, { foreignKey: 'organizationId', as: 'organization' });
    ShareLink.belongsTo(models.User, { foreignKey: 'createdByUserId', as: 'createdBy' });
  };

  return ShareLink;
};
