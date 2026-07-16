'use strict';

const { GEOMETRY_TYPE } = require('../../config/constants');

/**
 * Symbology (TENANT db) — a manager-defined, named drawing tool (point, line,
 * or polygon) with a color. Field surveys may only submit assets using a
 * symbology that has been assigned to their project (see ProjectSymbology).
 */
module.exports = (sequelize, DataTypes) => {
  const Symbology = sequelize.define(
    'Symbology',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      name: { type: DataTypes.STRING, allowNull: false },
      key: { type: DataTypes.STRING, allowNull: false, unique: true },
      geometryType: {
        type: DataTypes.ENUM(...Object.values(GEOMETRY_TYPE)),
        allowNull: false,
        field: 'geometry_type',
      },
      color: { type: DataTypes.STRING, allowNull: false, defaultValue: '#2f4fb4' },
    },
    {
      tableName: 'symbologies',
      underscored: true,
      timestamps: true,
    }
  );

  Symbology.associate = (models) => {
    Symbology.belongsToMany(models.Project, { through: models.ProjectSymbology, foreignKey: 'symbologyId', otherKey: 'projectId', as: 'projects' });
    Symbology.hasMany(models.NetworkAsset, { foreignKey: 'symbologyId', as: 'networkAssets' });
  };

  return Symbology;
};
