'use strict';

const { Joi } = require('../../middleware/validate.middleware');
const { PROJECT_STATUS } = require('../../config/constants');

const create = {
  body: Joi.object({
    name: Joi.string().trim().min(1).max(150).required(),
    description: Joi.string().allow('', null),
    status: Joi.string().valid(...Object.values(PROJECT_STATUS)),
  }),
};

const update = {
  params: Joi.object({ id: Joi.string().uuid().required() }),
  body: Joi.object({
    name: Joi.string().trim().min(1).max(150),
    description: Joi.string().allow('', null),
    status: Joi.string().valid(...Object.values(PROJECT_STATUS)),
  }).min(1),
};

const idParam = { params: Joi.object({ id: Joi.string().uuid().required() }) };

module.exports = { create, update, idParam };
