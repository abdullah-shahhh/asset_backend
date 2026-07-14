'use strict';

const catchAsync = require('../../utils/catchAsync');
const moduleService = require('../../services/admin/module.service');
const response = require('../../helpers/response.helper');

const list = catchAsync(async (req, res) => {
  const data = await moduleService.list();
  return response.success(res, { data });
});

const listForOrganization = catchAsync(async (req, res) => {
  const data = await moduleService.listForOrganization(req.params.organizationId);
  return response.success(res, { data });
});

const enableForOrganization = catchAsync(async (req, res) => {
  const data = await moduleService.enableForOrganization(req.params.organizationId, req.params.moduleId, { req });
  return response.success(res, { message: 'Module enabled', data });
});

const disableForOrganization = catchAsync(async (req, res) => {
  await moduleService.disableForOrganization(req.params.organizationId, req.params.moduleId, { req });
  return response.success(res, { message: 'Module disabled' });
});

module.exports = { list, listForOrganization, enableForOrganization, disableForOrganization };
