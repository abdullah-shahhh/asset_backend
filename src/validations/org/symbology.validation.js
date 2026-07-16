'use strict';

const { Joi } = require('../../middleware/validate.middleware');
const { GEOMETRY_TYPE } = require('../../config/constants');

const hexColor = Joi.string().pattern(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/);

const create = {
  body: Joi.object({
    name: Joi.string().trim().min(1).max(100).required(),
    geometryType: Joi.string().valid(...Object.values(GEOMETRY_TYPE)).required(),
    color: hexColor.required(),
  }),
};

const update = {
  params: Joi.object({ id: Joi.string().uuid().required() }),
  body: Joi.object({
    name: Joi.string().trim().min(1).max(100),
    color: hexColor,
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
