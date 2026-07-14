'use strict';

const catchAsync = require('../../utils/catchAsync');
const orgService = require('../../services/admin/organization.service');
const response = require('../../helpers/response.helper');

const list = catchAsync(async (req, res) => {
  const { organizations, pagination } = await orgService.list(req.query);
  return response.paginated(res, { data: organizations, pagination });
});

const get = catchAsync(async (req, res) => {
  const data = await orgService.getOverview(req.params.id);
  return response.success(res, { data });
});

const create = catchAsync(async (req, res) => {
  const organization = await orgService.create(req.body, { req });
  return response.created(res, { message: 'Organization created and provisioned', data: organization });
});

const update = catchAsync(async (req, res) => {
  const organization = await orgService.update(req.params.id, req.body, { req });
  return response.success(res, { message: 'Organization updated', data: organization });
});

const suspend = catchAsync(async (req, res) => {
  const organization = await orgService.suspend(req.params.id, req.body, { req });
  return response.success(res, { message: 'Organization suspended', data: organization });
});

const restore = catchAsync(async (req, res) => {
  const organization = await orgService.restore(req.params.id, { req });
  return response.success(res, { message: 'Organization restored', data: organization });
});

const listProjects = catchAsync(async (req, res) => {
  const { rows, pagination } = await orgService.listProjects(req.targetOrganization, req.query);
  return response.paginated(res, { data: rows, pagination });
});

const listNetworkAssets = catchAsync(async (req, res) => {
  const { rows, pagination } = await orgService.listNetworkAssets(req.targetOrganization, req.query);
  return response.paginated(res, { data: rows, pagination });
});

const listUsers = catchAsync(async (req, res) => {
  const { rows, pagination } = await orgService.listOrgUsers(req.targetOrganization, req.query);
  return response.paginated(res, { data: rows, pagination });
});

module.exports = { list, get, create, update, suspend, restore, listProjects, listNetworkAssets, listUsers };
