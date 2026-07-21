'use strict';

/** Join table: which surveyors are assigned to which project (TENANT db). */
module.exports = (sequelize, DataTypes) => {
  const ProjectSurveyor = sequelize.define(
    'ProjectSurveyor',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      projectId: { type: DataTypes.UUID, allowNull: false, field: 'project_id' },
      userId: { type: DataTypes.UUID, allowNull: false, field: 'user_id' },
    },
    {
      tableName: 'project_surveyors',
      underscored: true,
      timestamps: true,
      indexes: [{ unique: true, fields: ['project_id', 'user_id'] }],
    }
  );

  return ProjectSurveyor;
};
