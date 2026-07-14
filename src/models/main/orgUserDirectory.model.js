'use strict';

/**
 * Global org-staff login directory (MAIN db). Maps an org staff user's email
 * to the organization (tenant DB) that owns their account so they can log
 * into the client panel with email + password alone — no org slug at login.
 * Enforces one-email-one-organization across the whole platform via the
 * unique index on `email`.
 */
module.exports = (sequelize, DataTypes) => {
  const OrgUserDirectory = sequelize.define(
    'OrgUserDirectory',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      email: { type: DataTypes.STRING, allowNull: false, unique: true },
      organizationId: { type: DataTypes.UUID, allowNull: false, field: 'organization_id' },
    },
    {
      tableName: 'org_user_directory',
      underscored: true,
      timestamps: true,
      indexes: [{ unique: true, fields: ['email'] }, { fields: ['organization_id'] }],
    }
  );

  OrgUserDirectory.associate = (models) => {
    OrgUserDirectory.belongsTo(models.Organization, { foreignKey: 'organizationId', as: 'organization' });
  };

  return OrgUserDirectory;
};
