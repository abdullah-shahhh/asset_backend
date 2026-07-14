'use strict';

/**
 * SurveyTemplate (MAIN db) — dynamic form schema for a module (doc §3.1/§6).
 * `schemaJson` shape: { assetTypes: [{ key, label, geometryType, icon, color,
 * fields: [{ key, label, type, required, options? }] }] }. Module-level, not
 * org-specific — every org with the module enabled reads the same active
 * template live (no per-tenant copy to keep in sync).
 */
module.exports = (sequelize, DataTypes) => {
  const SurveyTemplate = sequelize.define(
    'SurveyTemplate',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      moduleId: { type: DataTypes.UUID, allowNull: false, field: 'module_id' },
      name: { type: DataTypes.STRING, allowNull: false },
      version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      schemaJson: { type: DataTypes.JSONB, allowNull: false, field: 'schema_json' },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' },
    },
    {
      tableName: 'survey_templates',
      underscored: true,
      timestamps: true,
    }
  );

  SurveyTemplate.associate = (models) => {
    SurveyTemplate.belongsTo(models.Module, { foreignKey: 'moduleId', as: 'module' });
  };

  return SurveyTemplate;
};
