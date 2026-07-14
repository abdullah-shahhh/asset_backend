'use strict';

/**
 * Module (MAIN db) — an installable asset-domain package (doc §3). Phase 1
 * seeds a single row: OFC. Sellable/enable-able per organization via
 * OrganizationModule.
 */
module.exports = (sequelize, DataTypes) => {
  const Module = sequelize.define(
    'Module',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      key: { type: DataTypes.STRING, allowNull: false, unique: true }, // e.g. 'OFC'
      name: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' },
    },
    {
      tableName: 'modules',
      underscored: true,
      timestamps: true,
    }
  );

  Module.associate = (models) => {
    Module.hasMany(models.SurveyTemplate, { foreignKey: 'moduleId', as: 'surveyTemplates' });
    Module.hasMany(models.OrganizationModule, { foreignKey: 'moduleId', as: 'organizationModules' });
  };

  return Module;
};
