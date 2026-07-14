'use strict';

const catchAsync = require('../../utils/catchAsync');
const userService = require('../../services/admin/user.service');
const response = require('../../helpers/response.helper');

const list = catchAsync(async (req, res) => {
  const { users, pagination } = await userService.list(req.query);
  return response.paginated(res, { data: users, pagination });
});

const get = catchAsync(async (req, res) => {
  const user = await userService.getById(req.params.id);
  return response.success(res, { data: user });
});

const create = catchAsync(async (req, res) => {
  const user = await userService.create(req.body);
  return response.created(res, { message: 'User created', data: user });
});

const update = catchAsync(async (req, res) => {
  const user = await userService.update(req.params.id, req.body);
  return response.success(res, { message: 'User updated', data: user });
});

const setStatus = catchAsync(async (req, res) => {
  const user = await userService.setStatus(req.params.id, req.body.status);
  return response.success(res, { message: 'User status updated', data: user });
});

const remove = catchAsync(async (req, res) => {
  await userService.remove(req.params.id);
  return response.success(res, { message: 'User deleted' });
});

module.exports = { list, get, create, update, setStatus, remove };
