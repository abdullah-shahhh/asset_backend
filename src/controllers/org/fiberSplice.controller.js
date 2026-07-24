'use strict';

const catchAsync = require('../../utils/catchAsync');
const spliceService = require('../../services/org/fiberSplice.service');
const response = require('../../helpers/response.helper');

const list = catchAsync(async (req, res) => {
  const splices = await spliceService.listForProject(req.db, req.query.projectId);
  return response.success(res, { data: splices });
});

const create = catchAsync(async (req, res) => {
  const splice = await spliceService.create(req.db, req.body);
  return response.created(res, { message: 'Splice created', data: splice });
});

const remove = catchAsync(async (req, res) => {
  await spliceService.remove(req.db, req.params.id);
  return response.success(res, { message: 'Splice removed' });
});

const trace = catchAsync(async (req, res) => {
  const result = await spliceService.trace(req.db, req.query);
  return response.success(res, { data: result });
});

module.exports = { list, create, remove, trace };
