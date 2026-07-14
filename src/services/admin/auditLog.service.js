'use strict';

const { mainDb } = require('../../database');
const { paginate } = require('../../helpers/pagination.helper');

async function list(query) {
  const where = {};
  if (query.organizationId) where.organizationId = query.organizationId;
  if (query.entity) where.entity = query.entity;
  if (query.action) where.action = query.action;
  const { rows, pagination } = await paginate(mainDb.AuditLog, query, { where });
  return { logs: rows, pagination };
}

module.exports = { list };
