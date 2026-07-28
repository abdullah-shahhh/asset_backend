'use strict';

const catchAsync = require('../../utils/catchAsync');
const ApiError = require('../../utils/ApiError');
const projectService = require('../../services/org/project.service');
const assetService = require('../../services/org/networkAsset.service');
const strandService = require('../../services/org/fiberStrand.service');
const portService = require('../../services/org/equipmentPort.service');
const connectionService = require('../../services/org/networkConnection.service');
const { connectionsToFeatureCollection } = require('../../helpers/geojson.helper');
const response = require('../../helpers/response.helper');

/** Every handler here is reachable with nothing but a guessable-looking
 * token, so each one re-derives its scope from req.shareLink.projectId —
 * never from anything the client passes in — and never touches another
 * project in the org even if an id for one leaks into a URL. */

const getProject = catchAsync(async (req, res) => {
  const project = await projectService.getById(req.db, req.shareLink.projectId);
  return response.success(res, {
    data: { id: project.id, name: project.name, description: project.description, organizationName: req.organization.name, expiresAt: req.shareLink.expiresAt },
  });
});

const listAssets = catchAsync(async (req, res) => {
  const { featureCollection } = await assetService.list(req.db, { projectId: req.shareLink.projectId, limit: 500 });
  return response.success(res, { data: featureCollection });
});

const listConnections = catchAsync(async (req, res) => {
  const connections = await connectionService.listForProject(req.db, req.shareLink.projectId);
  return response.success(res, { data: connectionsToFeatureCollection(connections) });
});

/** Confirms an asset id actually belongs to the shared project before
 * letting a strand/port lookup touch it. */
async function assertAssetInScope(req, assetId) {
  const asset = await assetService.getById(req.db, assetId);
  if (asset.projectId !== req.shareLink.projectId) throw ApiError.notFound('Network asset not found');
  return asset;
}

const listStrands = catchAsync(async (req, res) => {
  await assertAssetInScope(req, req.params.assetId);
  const strands = await strandService.listForAsset(req.db, req.params.assetId);
  return response.success(res, { data: strands });
});

const listPorts = catchAsync(async (req, res) => {
  await assertAssetInScope(req, req.params.assetId);
  const ports = await portService.listForAsset(req.db, req.params.assetId);
  return response.success(res, { data: ports });
});

module.exports = { getProject, listAssets, listConnections, listStrands, listPorts };
