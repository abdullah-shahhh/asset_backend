'use strict';

const { Joi } = require('../../middleware/validate.middleware');
const { GEOMETRY_TYPE } = require('../../config/constants');

const hexColor = Joi.string().pattern(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/);
// Icon is just a key into the frontend's curated icon picker — validated as a
// safe identifier, not against a server-side whitelist (purely cosmetic).
const icon = Joi.string().trim().max(40).pattern(/^[A-Za-z0-9]+$/).allow(null, '');

const create = {
  body: Joi.object({
    name: Joi.string().trim().min(1).max(100).required(),
    geometryType: Joi.string().valid(...Object.values(GEOMETRY_TYPE)).required(),
    color: hexColor.required(),
    icon,
  }),
};

const update = {
  params: Joi.object({ id: Joi.string().uuid().required() }),
  body: Joi.object({
    name: Joi.string().trim().min(1).max(100),
    color: hexColor,
    icon,
  }).min(1),
};

const idParam = { params: Joi.object({ id: Joi.string().uuid().required() }) };

const setForProject = {
  params: Joi.object({ id: Joi.string().uuid().required() }),
  body: Joi.object({
    symbologyIds: Joi.array().items(Joi.string().uuid()).required(),
  }),
};

module.exports = { create, update, idParam, setForProject };
