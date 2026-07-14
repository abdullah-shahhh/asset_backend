'use strict';

const { Joi } = require('../../middleware/validate.middleware');

const create = {
  body: Joi.object({
    name: Joi.string().trim().min(1).max(120).required(),
    slug: Joi.string().trim().lowercase().min(1).max(80),
    email: Joi.string().email({ tlds: { allow: false } }).allow('', null),
    contactName: Joi.string().allow('', null),
    contactPhone: Joi.string().allow('', null),
    address: Joi.string().allow('', null),
    country: Joi.string().allow('', null),
    timezone: Joi.string().allow('', null),
    adminUser: Joi.object({
      firstName: Joi.string().trim().min(1).max(80).required(),
      lastName: Joi.string().trim().max(80).allow('', null),
      email: Joi.string().email({ tlds: { allow: false } }).required(),
      password: Joi.string().min(8).max(128).required(),
      phone: Joi.string().allow('', null),
    }).required(),
  }),
};

const update = {
  params: Joi.object({ id: Joi.string().uuid().required() }),
  body: Joi.object({
    name: Joi.string().trim().min(1).max(120),
    email: Joi.string().email({ tlds: { allow: false } }).allow('', null),
    contactName: Joi.string().allow('', null),
    contactPhone: Joi.string().allow('', null),
    address: Joi.string().allow('', null),
    country: Joi.string().allow('', null),
    timezone: Joi.string().allow('', null),
  }).min(1),
};

const suspend = {
  params: Joi.object({ id: Joi.string().uuid().required() }),
  body: Joi.object({ reason: Joi.string().allow('', null) }),
};

const idParam = { params: Joi.object({ id: Joi.string().uuid().required() }) };

const moduleParam = {
  params: Joi.object({
    organizationId: Joi.string().uuid().required(),
    moduleId: Joi.string().uuid().required(),
  }),
};

const drillDownParams = {
  params: Joi.object({ organizationId: Joi.string().uuid().required() }),
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    sortBy: Joi.string(),
    sortOrder: Joi.string().valid('ASC', 'DESC', 'asc', 'desc'),
  }),
};

module.exports = { create, update, suspend, idParam, moduleParam, drillDownParams };
