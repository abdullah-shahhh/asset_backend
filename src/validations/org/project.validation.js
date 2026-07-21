'use strict';

const { Joi } = require('../../middleware/validate.middleware');
const { PROJECT_STATUS } = require('../../config/constants');

const templateField = Joi.object({
  key: Joi.string().trim().min(1).required(),
  label: Joi.string().trim().min(1).required(),
  type: Joi.string().valid('text', 'number', 'select', 'boolean', 'date', 'textarea').required(),
  required: Joi.boolean(),
  options: Joi.array().items(Joi.string()),
});

const create = {
  body: Joi.object({
    name: Joi.string().trim().min(1).max(150).required(),
    description: Joi.string().allow('', null),
    status: Joi.string().valid(...Object.values(PROJECT_STATUS)),
    surveyType: Joi.string().trim().min(1).max(100).default('Custom'),
    templateFields: Joi.array().items(templateField),
    photosRequired: Joi.boolean(),
  }),
};

const update = {
  params: Joi.object({ id: Joi.string().uuid().required() }),
  body: Joi.object({
    name: Joi.string().trim().min(1).max(150),
    description: Joi.string().allow('', null),
    status: Joi.string().valid(...Object.values(PROJECT_STATUS)),
    surveyType: Joi.string().trim().min(1).max(100),
    templateFields: Joi.array().items(templateField),
    photosRequired: Joi.boolean(),
  }).min(1),
};

const idParam = { params: Joi.object({ id: Joi.string().uuid().required() }) };

const setSurveyors = {
  params: Joi.object({ id: Joi.string().uuid().required() }),
  body: Joi.object({ surveyorIds: Joi.array().items(Joi.string().uuid()).required() }),
};

module.exports = { create, update, idParam, setSurveyors };
