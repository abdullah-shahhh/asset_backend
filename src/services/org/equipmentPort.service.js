'use strict';

const ApiError = require('../../utils/ApiError');
const { PORT_STATUS } = require('../../config/constants');

const EQUIPMENT_INCLUDE = [{ association: 'symbology' }];

async function getEquipmentAsset(models, assetId) {
  const asset = await models.NetworkAsset.findByPk(assetId, { include: EQUIPMENT_INCLUDE });
  if (!asset) throw ApiError.notFound('Network asset not found');
  return asset;
}

async function generate(models, assetId, portCount) {
  const asset = await getEquipmentAsset(models, assetId);
  if (!asset.symbology?.isEquipment) throw ApiError.badRequest('This asset type does not carry equipment ports');
  if (!Number.isInteger(portCount) || portCount < 1 || portCount > 1000) {
    throw ApiError.badRequest('Port count must be a whole number between 1 and 1000');
  }

  const existing = await models.EquipmentPort.count({ where: { networkAssetId: assetId } });
  if (existing > 0) throw ApiError.badRequest('Ports have already been generated for this equipment');

  const rows = Array.from({ length: portCount }, (_, i) => ({
    networkAssetId: assetId,
    portNumber: i + 1,
    status: PORT_STATUS.FREE,
  }));

  await models.EquipmentPort.bulkCreate(rows);
  return listForAsset(models, assetId);
}

async function listForAsset(models, assetId) {
  return models.EquipmentPort.findAll({
    where: { networkAssetId: assetId },
    order: [['portNumber', 'ASC']],
  });
}

async function getPort(models, assetId, portId) {
  const port = await models.EquipmentPort.findOne({ where: { id: portId, networkAssetId: assetId } });
  if (!port) throw ApiError.notFound('Equipment port not found');
  return port;
}

async function update(models, assetId, portId, { status, notes }) {
  const port = await getPort(models, assetId, portId);
  const patch = {};

  if (status !== undefined) {
    if (!Object.values(PORT_STATUS).includes(status)) throw ApiError.badRequest('Invalid port status');
    patch.status = status;
  }
  if (notes !== undefined) {
    patch.notes = notes || null;
  }

  await port.update(patch);
  return getPort(models, assetId, portId);
}

module.exports = { generate, listForAsset, getPort, update };
