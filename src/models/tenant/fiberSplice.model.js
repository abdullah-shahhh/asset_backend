'use strict';

/**
 * FiberSplice (TENANT db) — a physical junction connecting exactly two
 * endpoints, where each endpoint is either a fiber-strand end ('A' or 'Z'
 * side) or an equipment port. Flat nullable-column shape (not a normalized
 * join table) — mirrors NetworkConnection's flat-edge precedent and keeps
 * "find every splice touching strand X" a single indexed query
 * (`end_a_strand_id = X OR end_b_strand_id = X`).
 */
module.exports = (sequelize, DataTypes) => {
  const FiberSplice = sequelize.define(
    'FiberSplice',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      projectId: { type: DataTypes.UUID, allowNull: false, field: 'project_id' },
      // The physical closure/handhole this splice happens inside — optional context, not load-bearing for tracing.
      spliceAssetId: { type: DataTypes.UUID, allowNull: true, field: 'splice_asset_id' },
      endAType: { type: DataTypes.STRING(10), allowNull: false, field: 'end_a_type' }, // 'strand' | 'port'
      endAStrandId: { type: DataTypes.UUID, allowNull: true, field: 'end_a_strand_id' },
      endAStrandSide: { type: DataTypes.STRING(1), allowNull: true, field: 'end_a_strand_side' }, // 'A' | 'Z'
      endAPortId: { type: DataTypes.UUID, allowNull: true, field: 'end_a_port_id' },
      endBType: { type: DataTypes.STRING(10), allowNull: false, field: 'end_b_type' },
      endBStrandId: { type: DataTypes.UUID, allowNull: true, field: 'end_b_strand_id' },
      endBStrandSide: { type: DataTypes.STRING(1), allowNull: true, field: 'end_b_strand_side' },
      endBPortId: { type: DataTypes.UUID, allowNull: true, field: 'end_b_port_id' },
      notes: { type: DataTypes.STRING(255), allowNull: true },
    },
    {
      tableName: 'fiber_splices',
      underscored: true,
      timestamps: true,
      indexes: [
        { fields: ['project_id'] },
        { fields: ['end_a_strand_id'] },
        { fields: ['end_b_strand_id'] },
        { fields: ['end_a_port_id'] },
        { fields: ['end_b_port_id'] },
      ],
    }
  );

  FiberSplice.associate = (models) => {
    FiberSplice.belongsTo(models.Project, { foreignKey: 'projectId', as: 'project' });
    FiberSplice.belongsTo(models.NetworkAsset, { foreignKey: 'spliceAssetId', as: 'spliceAsset' });
    FiberSplice.belongsTo(models.FiberStrand, { foreignKey: 'endAStrandId', as: 'endAStrand' });
    FiberSplice.belongsTo(models.FiberStrand, { foreignKey: 'endBStrandId', as: 'endBStrand' });
    FiberSplice.belongsTo(models.EquipmentPort, { foreignKey: 'endAPortId', as: 'endAPort' });
    FiberSplice.belongsTo(models.EquipmentPort, { foreignKey: 'endBPortId', as: 'endBPort' });
  };

  return FiberSplice;
};
