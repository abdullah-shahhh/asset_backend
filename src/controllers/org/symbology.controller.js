'use strict';

const catchAsync = require('../../utils/catchAsync');
const symbologyService = require('../../services/org/symbology.service');
const response = require('../../helpers/response.helper');

const list = catchAsync(async (req, res) => {
  const symbologies = await symbologyService.list(req.db);
  return response.success(res, { data: symbologies });
});

const get = catchAsync(async (req, res) => {
  const symbology = await symbologyService.getById(req.db, req.params.id);
  return response.success(res, { data: symbology });
});

const create = catchAsync(async (req, res) => {
  const symbology = await symbologyService.create(req.db, req.body);
  return response.created(res, { message: 'Symbology created', data: symbology });
});

const update = catchAsync(async (req, res) => {
  const symbology = await symbologyService.update(req.db, req.params.id, req.body);
  return response.success(res, { message: 'Symbology updated', data: symbology });
});

const remove = catchAsync(async (req, res) => {
  await symbologyService.remove(req.db, req.params.id);
  return response.success(res, { message: 'Symbology deleted' });
});

const listForProject = catchAsync(async (req, res) => {
  const symbologies = await symbologyService.listForProject(req.db, req.params.id);
  return response.success(res, { data: symbologies });
});

const setForProject = catchAsync(async (req, res) => {
  const symbologies = await symbologyService.setForProject(req.db, req.params.id, req.body.symbologyIds);
  return response.success(res, { message: 'Project symbologies updated', data: symbologies });
});

module.exports = { list, get, create, update, remove, listForProject, setForProject };
