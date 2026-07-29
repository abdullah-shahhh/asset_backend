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
      // Icon identifier from a fixed, curated set (see ICON_OPTIONS on the
      // frontend) — only meaningful for Point symbologies, chosen freely by
      // the organization managing the symbology.
      icon: { type: DataTypes.STRING, allowNull: true },
      // A custom-uploaded icon image takes precedence over `icon` when set;
      // the two are kept mutually exclusive at the service layer.
      iconUrl: { type: DataTypes.STRING, allowNull: true, field: 'icon_url' },
      // Org-defined: does this symbology represent real equipment that can be
      // online/offline? Only meaningful for Point symbologies.
      isEquipment: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_equipment' },
      // Org-defined: does this symbology represent a fiber cable that carries
      // strands? Only meaningful for LineString symbologies.
      isCable: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_cable' },
      // Org-defined: does this symbology represent a radio transmitter (tower,
      // rooftop site) whose coverage can be estimated? Only meaningful for
      // Point symbologies. Gates the RF coverage panel on the map.
      isRfSite: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_rf_site' },
      // Line rendering width in pixels — only meaningful for LineString (and
      // Polygon outline) symbologies. Purely cosmetic, drives the map's paint
      // expressions (see MapDashboardPage's symbologyLineWidth).
      lineWidth: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 5, field: 'line_width' },
      // Dash pattern as a MapLibre line-dasharray array, e.g. [4, 2] for
      // dashed, [1, 2] for dotted, [] for solid. Only meaningful for
      // LineString symbologies. MapLibre's line-dasharray isn't a
      // data-driven expression, so the map groups lines into a small set of
      // dash-pattern layers filtered on this value rather than reading it
      // per-feature at paint time.
      dashArray: { type: DataTypes.JSONB, allowNull: false, defaultValue: [], field: 'dash_array' },
      // Custom attribute schema for assets of this type: [{ key, label, type,
      // required, options? }], same shape as Project.templateFields. Not
      // geometry-gated — any asset type can carry its own data fields. Takes
      // precedence over the project's own templateFields when non-empty (see
      // MapDashboardPage's effectiveFields).
      fields: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
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
