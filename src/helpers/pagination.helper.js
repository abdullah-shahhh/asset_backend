'use strict';

const { DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT } = require('../config/constants');

/**
 * Parse pagination + sorting params from a request query.
 * Supports: ?page=1&limit=20&sortBy=createdAt&sortOrder=DESC
 * @returns {{ page:number, limit:number, offset:number, order:Array }}
 */
function getPaginationParams(query = {}) {
  let page = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);

  if (Number.isNaN(page) || page < 1) page = DEFAULT_PAGE;
  if (Number.isNaN(limit) || limit < 1) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;

  const offset = (page - 1) * limit;

  const sortBy = query.sortBy || 'createdAt';
  const sortOrder = String(query.sortOrder || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  return { page, limit, offset, order: [[sortBy, sortOrder]] };
}

/**
 * Build a pagination meta object from a Sequelize findAndCountAll result.
 */
function buildPaginationMeta(count, page, limit) {
  const totalPages = Math.ceil(count / limit) || 1;
  return {
    total: count,
    page,
    limit,
    totalPages,
    hasPrevPage: page > 1,
    hasNextPage: page < totalPages,
  };
}

/**
 * Convenience: run findAndCountAll with pagination and return { rows, pagination }.
 * @param {import('sequelize').ModelStatic} model
 * @param {object} query request query for page/limit/sort
 * @param {object} [options] extra Sequelize options (where, include, ...)
 */
async function paginate(model, query = {}, options = {}) {
  const { page, limit, offset, order } = getPaginationParams(query);
  const { count, rows } = await model.findAndCountAll({
    ...options,
    limit,
    offset,
    order: options.order || order,
    distinct: true,
  });
  return { rows, pagination: buildPaginationMeta(count, page, limit) };
}

module.exports = { getPaginationParams, buildPaginationMeta, paginate };
