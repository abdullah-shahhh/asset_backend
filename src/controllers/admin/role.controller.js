'use strict';

const catchAsync = require('../../utils/catchAsync');
const roleService = require('../../services/admin/role.service');
const response = require('../../helpers/response.helper');

const listPermissions = catchAsync(async (req, res) => {
  const data = await roleService.listPermissions();
  return response.success(res, { message: 'Permissions fetched', data });
});

const list = catchAsync(async (req, res) => {
  const { roles, pagination } = await roleService.list(req.query);
  return response.paginated(res, { data: roles, pagination });
});

const get = catchAsync(async (req, res) => {
  const role = await roleService.getById(req.params.id);
  return response.success(res, { data: role });
});

const create = catchAsync(async (req, res) => {
  const role = await roleService.create(req.body);
  return response.created(res, { message: 'Role created', data: role });
});

const update = catchAsync(async (req, res) => {
  const role = await roleService.update(req.params.id, req.body);
  return response.success(res, { message: 'Role updated', data: role });
});

const remove = catchAsync(async (req, res) => {
  await roleService.remove(req.params.id);
  return response.success(res, { message: 'Role deleted' });
});

module.exports = { listPermissions, list, get, create, update, remove };
