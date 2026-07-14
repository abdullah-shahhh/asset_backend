'use strict';

const catchAsync = require('../../utils/catchAsync');
const projectService = require('../../services/org/project.service');
const response = require('../../helpers/response.helper');

const list = catchAsync(async (req, res) => {
  const { projects, pagination } = await projectService.list(req.db, req.query);
  return response.paginated(res, { data: projects, pagination });
});

const get = catchAsync(async (req, res) => {
  const project = await projectService.getById(req.db, req.params.id);
  return response.success(res, { data: project });
});

const create = catchAsync(async (req, res) => {
  const project = await projectService.create(req.db, req.body);
  return response.created(res, { message: 'Project created', data: project });
});

const update = catchAsync(async (req, res) => {
  const project = await projectService.update(req.db, req.params.id, req.body);
  return response.success(res, { message: 'Project updated', data: project });
});

const remove = catchAsync(async (req, res) => {
  await projectService.remove(req.db, req.params.id);
  return response.success(res, { message: 'Project deleted' });
});

module.exports = { list, get, create, update, remove };
