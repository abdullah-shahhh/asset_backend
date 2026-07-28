'use strict';

const { Joi } = require('../../middleware/validate.middleware');

const create = {
  body: Joi.object({
    projectId: Joi.string().uuid().required(),
    // null = never expires ("forever, until I revoke it") — explicit, not a default.
    expiresInHours: Joi.number().integer().min(1).max(24 * 30).allow(null).default(24),
    label: Joi.string().trim().max(120).allow('', null),
  }),
};

const list = {
  query: Joi.object({
    projectId: Joi.string().uuid().required(),
  }),
};

const idParam = { params: Joi.object({ id: Joi.string().uuid().required() }) };

module.exports = { create, list, idParam };
