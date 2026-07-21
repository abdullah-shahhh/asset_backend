'use strict';

const { PROJECT_STATUS } = require('../../config/constants');

/** Project (TENANT db) — a survey job/contract within the organization (doc §6). */
module.exports = (sequelize, DataTypes) => {
  const Project = sequelize.define(
    'Project',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      name: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      status: {
        type: DataTypes.ENUM(...Object.values(PROJECT_STATUS)),
        allowNull: false,
        defaultValue: PROJECT_STATUS.ACTIVE,
      },
      // Freeform label for what kind of survey this project collects — the
      // organization names it themselves (e.g. "OFC Survey", "Storm Drain
      // Inspection"), it isn't picked from a fixed list.
      surveyType: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: 'Custom',
        field: 'survey_type',
      },
      templateFields: { type: DataTypes.JSONB, allowNull: false, defaultValue: [], field: 'template_fields' },
      photosRequired: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'photos_required' },
    },
    {
      tableName: 'projects',
      underscored: true,
      timestamps: true,
      paranoid: true,
    }
  );

  Project.associate = (models) => {
    Project.hasMany(models.NetworkAsset, { foreignKey: 'projectId', as: 'networkAssets' });
    Project.belongsToMany(models.Symbology, { through: models.ProjectSymbology, foreignKey: 'projectId', otherKey: 'symbologyId', as: 'symbologies' });
    Project.belongsToMany(models.User, { through: models.ProjectSurveyor, foreignKey: 'projectId', otherKey: 'userId', as: 'surveyors' });
  };

  return Project;
};
