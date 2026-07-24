'use strict';

const catchAsync = require('../../utils/catchAsync');
const assetService = require('../../services/org/networkAsset.service');
const strandService = require('../../services/org/fiberStrand.service');
const portService = require('../../services/org/equipmentPort.service');
const response = require('../../helpers/response.helper');

const list = catchAsync(async (req, res) => {
  const { featureCollection, pagination } = await assetService.list(req.db, req.query);
  return response.success(res, { message: 'Success', data: featureCollection, meta: { pagination } });
});

const alarms = catchAsync(async (req, res) => {
  const data = await assetService.listAlarms(req.db);
  return response.success(res, { data });
});

const get = catchAsync(async (req, res) => {
  const asset = await assetService.getById(req.db, req.params.id);
  return response.success(res, { data: assetService.assetToFeature(asset) });
});

const create = catchAsync(async (req, res) => {
  const asset = await assetService.create(req.db, req.organization, req.user, req.body, req.isSuperAdmin);
  return response.created(res, { message: 'Network asset created', data: assetService.assetToFeature(asset) });
});

const update = catchAsync(async (req, res) => {
  const asset = await assetService.update(req.db, req.params.id, req.body);
  return response.success(res, { message: 'Network asset updated', data: assetService.assetToFeature(asset) });
});

const approve = catchAsync(async (req, res) => {
  const asset = await assetService.approve(req.db, req.params.id, req.user, { req });
  return response.success(res, { message: 'Network asset approved', data: assetService.assetToFeature(asset) });
});

const reject = catchAsync(async (req, res) => {
  const asset = await assetService.reject(req.db, req.params.id, req.user, req.body.reason, { req });
  return response.success(res, { message: 'Network asset rejected', data: assetService.assetToFeature(asset) });
});

const remove = catchAsync(async (req, res) => {
  await assetService.remove(req.db, req.params.id);
  return response.success(res, { message: 'Network asset deleted' });
});

const importGeoJSON = catchAsync(async (req, res) => {
  const summary = await assetService.importFeatureCollection(req.db, req.organization, req.user, req.body, req.isSuperAdmin);
  return response.success(res, {
    message: `Imported ${summary.created} of ${summary.total} feature(s)`,
    data: summary,
  });
});

const generateStrands = catchAsync(async (req, res) => {
  const strands = await strandService.generate(req.db, req.params.id, req.body.strandCount);
  return response.created(res, { message: `Generated ${strands.length} strand(s)`, data: strands });
});

const listStrands = catchAsync(async (req, res) => {
  const strands = await strandService.listForAsset(req.db, req.params.id);
  return response.success(res, { data: strands });
});

const updateStrand = catchAsync(async (req, res) => {
  const strand = await strandService.update(req.db, req.params.id, req.params.strandId, req.body);
  return response.success(res, { message: 'Strand updated', data: strand });
});

const generatePorts = catchAsync(async (req, res) => {
  const ports = await portService.generate(req.db, req.params.id, req.body.portCount);
  return response.created(res, { message: `Generated ${ports.length} port(s)`, data: ports });
});

const listPorts = catchAsync(async (req, res) => {
  const ports = await portService.listForAsset(req.db, req.params.id);
  return response.success(res, { data: ports });
});

const updatePort = catchAsync(async (req, res) => {
  const port = await portService.update(req.db, req.params.id, req.params.portId, req.body);
  return response.success(res, { message: 'Port updated', data: port });
});

module.exports = {
  list,
  alarms,
  get,
  create,
  update,
  remove,
  approve,
  reject,
  importGeoJSON,
  generateStrands,
  listStrands,
  updateStrand,
  generatePorts,
  listPorts,
  updatePort,
};
