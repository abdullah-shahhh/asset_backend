'use strict';

const { STRAND_STATUS, STRAND_ROLE } = require('../../config/constants');

/**
 * FiberStrand (TENANT db) — one physical fiber within a cable asset (whose
 * symbology is flagged is_cable). Auto-generated in bulk by
 * fiberStrand.service.js#generate against a standard strand count
 * (12/24/48/96/144/288); tube_number and color follow the TIA-598 12-count
 * buffer-tube convention. Lean, FK-only child record — no project_id, no
 * paranoid — same shape as MediaAttachment.
 */
module.exports = (sequelize, DataTypes) => {
  const FiberStrand = sequelize.define(
    'FiberStrand',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      networkAssetId: { type: DataTypes.UUID, allowNull: false, field: 'network_asset_id' },
      strandNumber: { type: DataTypes.INTEGER, allowNull: false, field: 'strand_number' },
      tubeNumber: { type: DataTypes.INTEGER, allowNull: false, field: 'tube_number' },
      color: { type: DataTypes.STRING(20), allowNull: false },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: STRAND_STATUS.AVAILABLE,
      },
      // Optional — where in the network this strand sits. Manager-assigned.
      role: { type: DataTypes.STRING(20), allowNull: true },
      // Direct attribution: which customer/home this strand serves, independent
      // of (and in addition to) whatever the splice graph would trace to.
      assignedCustomerId: { type: DataTypes.UUID, allowNull: true, field: 'assigned_customer_id' },
      notes: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      tableName: 'fiber_strands',
      underscored: true,
      timestamps: true,
      indexes: [{ fields: ['network_asset_id'] }, { fields: ['assigned_customer_id'] }],
    }
  );

  FiberStrand.associate = (models) => {
    FiberStrand.belongsTo(models.NetworkAsset, { foreignKey: 'networkAssetId', as: 'cable' });
    FiberStrand.belongsTo(models.Customer, { foreignKey: 'assignedCustomerId', as: 'assignedCustomer' });
  };

  FiberStrand.STATUS_VALUES = Object.values(STRAND_STATUS);
  FiberStrand.ROLE_VALUES = Object.values(STRAND_ROLE);

  return FiberStrand;
};
