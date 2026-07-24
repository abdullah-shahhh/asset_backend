'use strict';

const { PORT_STATUS } = require('../../config/constants');

/**
 * EquipmentPort (TENANT db) — a typed port on an equipment asset (OLT, ODF,
 * splitter, patch panel — any asset whose symbology is flagged is_equipment).
 * Auto-generated in bulk by equipmentPort.service.js#generate. Status flips
 * to 'connected' automatically when a FiberSplice references the port (see
 * fiberSplice.service.js), otherwise stays 'free'.
 */
module.exports = (sequelize, DataTypes) => {
  const EquipmentPort = sequelize.define(
    'EquipmentPort',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      networkAssetId: { type: DataTypes.UUID, allowNull: false, field: 'network_asset_id' },
      portNumber: { type: DataTypes.INTEGER, allowNull: false, field: 'port_number' },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: PORT_STATUS.FREE,
      },
      notes: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      tableName: 'equipment_ports',
      underscored: true,
      timestamps: true,
      indexes: [{ fields: ['network_asset_id'] }],
    }
  );

  EquipmentPort.associate = (models) => {
    EquipmentPort.belongsTo(models.NetworkAsset, { foreignKey: 'networkAssetId', as: 'equipment' });
  };

  EquipmentPort.STATUS_VALUES = Object.values(PORT_STATUS);

  return EquipmentPort;
};
