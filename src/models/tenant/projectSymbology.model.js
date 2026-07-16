'use strict';

/** Join table: which symbologies are assigned to which project (TENANT db). */
module.exports = (sequelize, DataTypes) => {
  const ProjectSymbology = sequelize.define(
    'ProjectSymbology',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      projectId: { type: DataTypes.UUID, allowNull: false, field: 'project_id' },
      symbologyId: { type: DataTypes.UUID, allowNull: false, field: 'symbology_id' },
    },
    {
      tableName: 'project_symbologies',
      underscored: true,
      timestamps: true,
      indexes: [{ unique: true, fields: ['project_id', 'symbology_id'] }],
    }
  );

  return ProjectSymbology;
};
