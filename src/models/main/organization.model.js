'use strict';

const { ORGANIZATION_STATUS } = require('../../config/constants');

/**
 * Organization = tenant (MAIN db). A client (city/utility/contractor). Holds
 * onboarding details, status, and the connection info for its dedicated
 * database (doc §5/§6: "maps to one tenant database").
 */
module.exports = (sequelize, DataTypes) => {
  const Organization = sequelize.define(
    'Organization',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      name: { type: DataTypes.STRING, allowNull: false },
      slug: { type: DataTypes.STRING, allowNull: false, unique: true },
      // Dedicated Postgres database name for this organization.
      dbName: { type: DataTypes.STRING, allowNull: false, unique: true, field: 'db_name' },
      // Short, human-shareable code the future mobile app uses so a field
      // surveyor can self-register against this organization ("send a
      // company code so drivers/surveyors can be added").
      joinCode: { type: DataTypes.STRING, allowNull: false, unique: true, field: 'join_code' },

      email: { type: DataTypes.STRING, allowNull: true, validate: { isEmail: true } },
      contactName: { type: DataTypes.STRING, allowNull: true, field: 'contact_name' },
      contactPhone: { type: DataTypes.STRING, allowNull: true, field: 'contact_phone' },
      address: { type: DataTypes.TEXT, allowNull: true },
      country: { type: DataTypes.STRING, allowNull: true },
      timezone: { type: DataTypes.STRING, allowNull: false, defaultValue: 'UTC' },

      status: {
        type: DataTypes.ENUM(...Object.values(ORGANIZATION_STATUS)),
        allowNull: false,
        defaultValue: ORGANIZATION_STATUS.PENDING,
      },
      isProvisioned: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'is_provisioned',
      },

      suspendedAt: { type: DataTypes.DATE, allowNull: true, field: 'suspended_at' },
      suspendReason: { type: DataTypes.STRING, allowNull: true, field: 'suspend_reason' },

      // Branding — applied live in the client panel (doc §4.3 client web panel).
      logoUrl: { type: DataTypes.STRING, allowNull: true, field: 'logo_url' },
      primaryColor: { type: DataTypes.STRING, allowNull: true, field: 'primary_color' },
      secondaryColor: { type: DataTypes.STRING, allowNull: true, field: 'secondary_color' },
      textPrimaryColor: { type: DataTypes.STRING, allowNull: true, field: 'text_primary_color' },
      textSecondaryColor: { type: DataTypes.STRING, allowNull: true, field: 'text_secondary_color' },

      metadata: { type: DataTypes.JSONB, allowNull: true },
    },
    {
      tableName: 'organizations',
      underscored: true,
      timestamps: true,
      paranoid: true,
    }
  );

  Organization.associate = (models) => {
    Organization.hasMany(models.OrganizationModule, { foreignKey: 'organizationId', as: 'organizationModules' });
    Organization.hasMany(models.OrgUserDirectory, { foreignKey: 'organizationId', as: 'directoryEntries' });
  };

  return Organization;
};
