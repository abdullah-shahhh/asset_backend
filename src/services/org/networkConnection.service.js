'use strict';

const ApiError = require('../../utils/ApiError');

const ENDPOINT_ATTRS = ['id', 'geom', 'geometryType'];
const ASSET_INCLUDES = [
  { association: 'fromAsset', attributes: ENDPOINT_ATTRS },
  { association: 'toAsset', attributes: ENDPOINT_ATTRS },
];

async function listForProject(models, projectId) {
  return models.NetworkConnection.findAll({
    where: { projectId },
    include: ASSET_INCLUDES,
    order: [['createdAt', 'ASC']],
  });
}

async function create(models, { projectId, fromAssetId, toAssetId, label }) {
  const [fromAsset, toAsset] = await Promise.all([
    models.NetworkAsset.findByPk(fromAssetId),
    models.NetworkAsset.findByPk(toAssetId),
  ]);
  if (!fromAsset || fromAsset.projectId !== projectId) throw ApiError.badRequest('"fromAssetId" is not a valid asset in this project');
  if (!toAsset || toAsset.projectId !== projectId) throw ApiError.badRequest('"toAssetId" is not a valid asset in this project');

  const connection = await models.NetworkConnection.create({
    projectId,
    fromAssetId,
    toAssetId,
    label: label || null,
  });

  return models.NetworkConnection.findByPk(connection.id, { include: ASSET_INCLUDES });
}

async function remove(models, id) {
  const connection = await models.NetworkConnection.findByPk(id);
  if (!connection) throw ApiError.notFound('Connection not found');
  await connection.destroy();
  return true;
}

module.exports = { listForProject, create, remove };
