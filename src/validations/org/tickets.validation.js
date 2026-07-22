'use strict';

const { Joi } = require('../../middleware/validate.middleware');
const { TICKET_STATUS, TICKET_PRIORITY } = require('../../config/constants');

const create = {
  body: Joi.object({
    customerId: Joi.string().uuid().required(),
    subject: Joi.string().trim().min(1).max(200).required(),
    description: Joi.string().allow('', null),
    status: Joi.string().valid(...Object.values(TICKET_STATUS)),
    priority: Joi.string().valid(...Object.values(TICKET_PRIORITY)),
  }),
};

const update = {
  params: Joi.object({ id: Joi.string().uuid().required() }),
  body: Joi.object({
    subject: Joi.string().trim().min(1).max(200),
    description: Joi.string().allow('', null),
    status: Joi.string().valid(...Object.values(TICKET_STATUS)),
    priority: Joi.string().valid(...Object.values(TICKET_PRIORITY)),
  }).min(1),
};

const idParam = { params: Joi.object({ id: Joi.string().uuid().required() }) };

const listQuery = {
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(500),
    sortBy: Joi.string(),
    sortOrder: Joi.string().valid('ASC', 'DESC', 'asc', 'desc'),
    customerId: Joi.string().uuid(),
    status: Joi.string().valid(...Object.values(TICKET_STATUS)),
  }),
};

module.exports = { create, update, idParam, listQuery };
