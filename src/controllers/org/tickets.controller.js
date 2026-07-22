'use strict';

const catchAsync = require('../../utils/catchAsync');
const ticketsService = require('../../services/org/tickets.service');
const response = require('../../helpers/response.helper');

const list = catchAsync(async (req, res) => {
  const { tickets, pagination } = await ticketsService.list(req.db, req.query);
  return response.paginated(res, { data: tickets, pagination });
});

const get = catchAsync(async (req, res) => {
  const ticket = await ticketsService.getById(req.db, req.params.id);
  return response.success(res, { data: ticket });
});

const create = catchAsync(async (req, res) => {
  const ticket = await ticketsService.create(req.db, req.body);
  return response.created(res, { message: 'Ticket created', data: ticket });
});

const update = catchAsync(async (req, res) => {
  const ticket = await ticketsService.update(req.db, req.params.id, req.body);
  return response.success(res, { message: 'Ticket updated', data: ticket });
});

const remove = catchAsync(async (req, res) => {
  await ticketsService.remove(req.db, req.params.id);
  return response.success(res, { message: 'Ticket deleted' });
});

module.exports = { list, get, create, update, remove };
