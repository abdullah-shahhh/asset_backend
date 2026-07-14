'use strict';

const { Joi } = require('../../middleware/validate.middleware');

const assetTypeField = Joi.object({
  key: Joi.string().required(),
  label: Joi.string().required(),
  type: Joi.string().valid('text', 'number', 'select', 'boolean', 'date', 'textarea').required(),
  required: Joi.boolean().default(false),
  options: Joi.array().items(Joi.string()),
});

const assetType = Joi.object({
  key: Joi.string().required(),
  label: Joi.string().required(),
  geometryType: Joi.string().valid('Point', 'LineString').required(),
  icon: Joi.string().allow('', null),
  color: Joi.string().allow('', null),
  fields: Joi.array().items(assetTypeField).default([]),
});

const schemaJson = Joi.object({
  assetTypes: Joi.array().items(assetType).min(1).required(),
});

const create = {
  body: Joi.object({
    moduleId: Joi.string().uuid().required(),
    name: Joi.string().trim().min(1).max(120).required(),
    schemaJson: schemaJson.required(),
  }),
};

const update = {
  params: Joi.object({ id: Joi.string().uuid().required() }),
  body: Joi.object({
    name: Joi.string().trim().min(1).max(120),
    schemaJson,
    isActive: Joi.boolean(),
  }).min(1),
};

const idParam = { params: Joi.object({ id: Joi.string().uuid().required() }) };

const listQuery = {
  query: Joi.object({ moduleId: Joi.string().uuid() }),
};

module.exports = { create, update, idParam, listQuery };
