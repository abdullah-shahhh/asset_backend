'use strict';

const { paginate } = require('../../helpers/pagination.helper');
const ApiError = require('../../utils/ApiError');
const { TICKET_STATUS, TICKET_PRIORITY } = require('../../config/constants');

const CUSTOMER_INCLUDE = { association: 'customer', attributes: ['id', 'name', 'email', 'networkAssetId'] };

async function list(models, query) {
  const where = {};
  if (query.customerId) where.customerId = query.customerId;
  if (query.status) where.status = query.status;
  const { rows, pagination } = await paginate(models.Ticket, query, { where, include: [CUSTOMER_INCLUDE] });
  return { tickets: rows, pagination };
}

async function getById(models, id) {
  const ticket = await models.Ticket.findByPk(id, { include: [CUSTOMER_INCLUDE] });
  if (!ticket) throw ApiError.notFound('Ticket not found');
  return ticket;
}

async function create(models, { customerId, subject, description, status, priority }) {
  const customer = await models.Customer.findByPk(customerId);
  if (!customer) throw ApiError.badRequest('Invalid customer');
  const ticket = await models.Ticket.create({
    customerId,
    subject,
    description: description || null,
    status: status || TICKET_STATUS.OPEN,
    priority: priority || TICKET_PRIORITY.MEDIUM,
  });
  return getById(models, ticket.id);
}

async function update(models, id, { subject, description, status, priority }) {
  const ticket = await getById(models, id);
  await ticket.update({
    ...(subject != null && { subject }),
    ...(description !== undefined && { description: description || null }),
    ...(status != null && { status }),
    ...(priority != null && { priority }),
  });
  return getById(models, id);
}

async function remove(models, id) {
  const ticket = await getById(models, id);
  await ticket.destroy();
  return true;
}

module.exports = { list, getById, create, update, remove };
