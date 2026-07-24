'use strict';

const { Joi } = require('../../middleware/validate.middleware');

const endpoint = Joi.object({
  type: Joi.string().valid('strand', 'port').required(),
  strandId: Joi.string().uuid().when('type', { is: 'strand', then: Joi.required() }),
  side: Joi.string().valid('A', 'Z').when('type', { is: 'strand', then: Joi.required() }),
  portId: Joi.string().uuid().when('type', { is: 'port', then: Joi.required() }),
});

const listQuery = {
  query: Joi.object({ projectId: Joi.string().uuid().required() }),
};

const create = {
  body: Joi.object({
    projectId: Joi.string().uuid().required(),
    spliceAssetId: Joi.string().uuid().allow(null),
    endA: endpoint.required(),
    endB: endpoint.required(),
    notes: Joi.string().allow('', null),
  }),
};

const idParam = { params: Joi.object({ id: Joi.string().uuid().required() }) };

const traceQuery = {
  query: Joi.object({
    strandId: Joi.string().uuid(),
    portId: Joi.string().uuid(),
  }).or('strandId', 'portId'),
};

module.exports = { listQuery, create, idParam, traceQuery };
