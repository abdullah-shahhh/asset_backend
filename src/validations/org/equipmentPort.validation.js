'use strict';

const { Joi } = require('../../middleware/validate.middleware');
const { PORT_STATUS } = require('../../config/constants');

const generate = {
  params: Joi.object({ id: Joi.string().uuid().required() }),
  body: Joi.object({
    portCount: Joi.number().integer().min(1).max(1000).required(),
  }),
};

const update = {
  params: Joi.object({ id: Joi.string().uuid().required(), portId: Joi.string().uuid().required() }),
  body: Joi.object({
    status: Joi.string().valid(...Object.values(PORT_STATUS)),
    notes: Joi.string().allow('', null),
  }).min(1),
};

module.exports = { generate, update };
