'use strict';

const { Joi } = require('../../middleware/validate.middleware');
const { STRAND_STATUS, STRAND_ROLE } = require('../../config/constants');

const idParam = { params: Joi.object({ id: Joi.string().uuid().required() }) };

const generate = {
  params: Joi.object({ id: Joi.string().uuid().required() }),
  body: Joi.object({
    strandCount: Joi.number().integer().valid(12, 24, 48, 96, 144, 288).required(),
  }),
};

const update = {
  params: Joi.object({ id: Joi.string().uuid().required(), strandId: Joi.string().uuid().required() }),
  body: Joi.object({
    status: Joi.string().valid(...Object.values(STRAND_STATUS)),
    role: Joi.string().valid(...Object.values(STRAND_ROLE)).allow(null),
    assignedCustomerId: Joi.string().uuid().allow(null),
    notes: Joi.string().allow('', null),
  }).min(1),
};

module.exports = { idParam, generate, update };
