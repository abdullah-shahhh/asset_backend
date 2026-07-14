'use strict';

const catchAsync = require('../../utils/catchAsync');
const templateService = require('../../services/admin/surveyTemplate.service');
const response = require('../../helpers/response.helper');

const list = catchAsync(async (req, res) => {
  const data = await templateService.list(req.query);
  return response.success(res, { data });
});

const get = catchAsync(async (req, res) => {
  const data = await templateService.getById(req.params.id);
  return response.success(res, { data });
});

const create = catchAsync(async (req, res) => {
  const data = await templateService.create(req.body);
  return response.created(res, { message: 'Survey template created', data });
});

const update = catchAsync(async (req, res) => {
  const data = await templateService.update(req.params.id, req.body);
  return response.success(res, { message: 'Survey template updated', data });
});

module.exports = { list, get, create, update };
