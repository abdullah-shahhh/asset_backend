'use strict';

/**
 * Join table: which modules are enabled for which organization (doc §3.3
 * "module marketplace" — sellable as add-ons, independent per client).
 */
module.exports = (sequelize, DataTypes) => {
  const OrganizationModule = sequelize.define(
    'OrganizationModule',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      organizationId: { type: DataTypes.UUID, allowNull: false, field: 'organization_id' },
      moduleId: { type: DataTypes.UUID, allowNull: false, field: 'module_id' },
      enabledAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'enabled_at' },
    },
    {
      tableName: 'organization_modules',
      underscored: true,
      timestamps: true,
      indexes: [{ unique: true, fields: ['organization_id', 'module_id'] }],
    }
  );

  OrganizationModule.associate = (models) => {
    OrganizationModule.belongsTo(models.Organization, { foreignKey: 'organizationId', as: 'organization' });
    OrganizationModule.belongsTo(models.Module, { foreignKey: 'moduleId', as: 'module' });
  };

  return OrganizationModule;
};
