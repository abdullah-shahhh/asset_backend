'use strict';

const catchAsync = require('../../utils/catchAsync');
const customersService = require('../../services/org/customers.service');
const response = require('../../helpers/response.helper');

const list = catchAsync(async (req, res) => {
  const { customers, pagination } = await customersService.list(req.db, req.query);
  return response.paginated(res, { data: customers, pagination });
});

const get = catchAsync(async (req, res) => {
  const customer = await customersService.getById(req.db, req.params.id);
  return response.success(res, { data: customer });
});

const create = catchAsync(async (req, res) => {
  const customer = await customersService.create(req.db, req.body);
  return response.created(res, { message: 'Customer created', data: customer });
});

const update = catchAsync(async (req, res) => {
  const customer = await customersService.update(req.db, req.params.id, req.body);
  return response.success(res, { message: 'Customer updated', data: customer });
});

const remove = catchAsync(async (req, res) => {
  await customersService.remove(req.db, req.params.id);
  return response.success(res, { message: 'Customer deleted' });
});

module.exports = { list, get, create, update, remove };
