'use strict';

const { Joi } = require('../../middleware/validate.middleware');

const create = {
  body: Joi.object({
    name: Joi.string().trim().min(1).max(150).required(),
    email: Joi.string().email({ tlds: { allow: false } }).allow('', null),
    phone: Joi.string().trim().max(30).allow('', null),
    address: Joi.string().trim().max(255).allow('', null),
    networkAssetId: Joi.string().uuid().allow(null),
  }),
};

const update = {
  params: Joi.object({ id: Joi.string().uuid().required() }),
  body: Joi.object({
    name: Joi.string().trim().min(1).max(150),
    email: Joi.string().email({ tlds: { allow: false } }).allow('', null),
    phone: Joi.string().trim().max(30).allow('', null),
    address: Joi.string().trim().max(255).allow('', null),
    networkAssetId: Joi.string().uuid().allow(null),
  }).min(1),
};

const idParam = { params: Joi.object({ id: Joi.string().uuid().required() }) };

const listQuery = {
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(500),
    sortBy: Joi.string(),
    sortOrder: Joi.string().valid('ASC', 'DESC', 'asc', 'desc'),
    networkAssetId: Joi.string().uuid(),
  }),
};

module.exports = { create, update, idParam, listQuery };
