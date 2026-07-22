'use strict';

const { Joi } = require('../../middleware/validate.middleware');

const listQuery = {
  query: Joi.object({
    projectId: Joi.string().uuid().required(),
  }),
};

const create = {
  body: Joi.object({
    projectId: Joi.string().uuid().required(),
    fromAssetId: Joi.string().uuid().required(),
    toAssetId: Joi.string().uuid().required().invalid(Joi.ref('fromAssetId')).messages({ 'any.invalid': '"toAssetId" must be different from "fromAssetId"' }),
    label: Joi.string().trim().max(100).allow('', null),
  }),
};

const idParam = { params: Joi.object({ id: Joi.string().uuid().required() }) };

module.exports = { listQuery, create, idParam };
