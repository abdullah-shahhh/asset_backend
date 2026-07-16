'use strict';

const { Joi } = require('../../middleware/validate.middleware');
const { NETWORK_ASSET_STATUS, GEOMETRY_TYPE } = require('../../config/constants');

const point = Joi.array().items(Joi.number()).length(2);
const lineString = Joi.array().items(point).min(2);
const linearRing = Joi.array().items(point).min(4); // closed ring: first point === last point
const polygon = Joi.array().items(linearRing).min(1);

const geometry = Joi.object({
  type: Joi.string().valid(...Object.values(GEOMETRY_TYPE)).required(),
  coordinates: Joi.alternatives().conditional('type', [
    { is: GEOMETRY_TYPE.POINT, then: point.required() },
    { is: GEOMETRY_TYPE.POLYGON, then: polygon.required() },
    { is: GEOMETRY_TYPE.LINE, then: lineString.required() },
  ]),
});

const create = {
  body: Joi.object({
    projectId: Joi.string().uuid().required(),
    symbologyId: Joi.string().uuid().required(),
    geometry: geometry.required(),
    attributes: Joi.object().unknown(true).default({}),
  }),
};

const update = {
  params: Joi.object({ id: Joi.string().uuid().required() }),
  body: Joi.object({
    geometry,
    attributes: Joi.object().unknown(true),
  }).min(1),
};

const reject = {
  params: Joi.object({ id: Joi.string().uuid().required() }),
  body: Joi.object({ reason: Joi.string().allow('', null) }),
};

const importGeoJSON = {
  body: Joi.object({
    projectId: Joi.string().uuid().required(),
    featureCollection: Joi.object({
      type: Joi.string().valid('FeatureCollection').required(),
      features: Joi.array()
        .items(
          Joi.object({
            type: Joi.string().valid('Feature').required(),
            geometry: geometry.required(),
            properties: Joi.object().unknown(true).required(),
          })
        )
        .min(1)
        .required(),
    }).required(),
  }),
};

const idParam = { params: Joi.object({ id: Joi.string().uuid().required() }) };

const listQuery = {
  query: Joi.object({
    page: Joi.number().integer().min(1),
    // Higher ceiling than the general pagination default — the map view
    // wants every asset in view, not just a page of them.
    limit: Joi.number().integer().min(1).max(500),
    sortBy: Joi.string(),
    sortOrder: Joi.string().valid('ASC', 'DESC', 'asc', 'desc'),
    projectId: Joi.string().uuid(),
    symbologyId: Joi.string().uuid(),
    assetType: Joi.string(),
    status: Joi.string().valid(...Object.values(NETWORK_ASSET_STATUS)),
  }),
};

module.exports = { create, update, reject, idParam, listQuery, importGeoJSON };
