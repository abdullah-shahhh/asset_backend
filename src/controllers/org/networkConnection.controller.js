'use strict';

const catchAsync = require('../../utils/catchAsync');
const connectionService = require('../../services/org/networkConnection.service');
const { connectionsToFeatureCollection, connectionToFeature } = require('../../helpers/geojson.helper');
const response = require('../../helpers/response.helper');

const list = catchAsync(async (req, res) => {
  const connections = await connectionService.listForProject(req.db, req.query.projectId);
  return response.success(res, { data: connectionsToFeatureCollection(connections) });
});

const create = catchAsync(async (req, res) => {
  const connection = await connectionService.create(req.db, req.body);
  return response.created(res, { message: 'Connection created', data: connectionToFeature(connection) });
});

const remove = catchAsync(async (req, res) => {
  await connectionService.remove(req.db, req.params.id);
  return response.success(res, { message: 'Connection deleted' });
});

module.exports = { list, create, remove };
