'use strict';

const { Joi } = require('../../middleware/validate.middleware');

const create = {
  body: Joi.object({
    name: Joi.string().trim().min(1).max(80).required(),
    description: Joi.string().allow('', null),
    permissionKeys: Joi.array().items(Joi.string()).default([]),
  }),
};

const update = {
  params: Joi.object({ id: Joi.string().uuid().required() }),
  body: Joi.object({
    name: Joi.string().trim().min(1).max(80),
    description: Joi.string().allow('', null),
    isActive: Joi.boolean(),
    permissionKeys: Joi.array().items(Joi.string()),
  }).min(1),
};

const idParam = { params: Joi.object({ id: Joi.string().uuid().required() }) };

module.exports = { create, update, idParam };
