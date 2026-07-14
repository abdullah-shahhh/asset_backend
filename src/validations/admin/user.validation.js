'use strict';

const { Joi } = require('../../middleware/validate.middleware');
const { USER_STATUS } = require('../../config/constants');

const create = {
  body: Joi.object({
    firstName: Joi.string().trim().min(1).max(80).required(),
    lastName: Joi.string().trim().max(80).allow('', null),
    email: Joi.string().email({ tlds: { allow: false } }).required(),
    password: Joi.string().min(8).max(128).required(),
    phone: Joi.string().allow('', null),
    roleId: Joi.string().uuid().required(),
  }),
};

const update = {
  params: Joi.object({ id: Joi.string().uuid().required() }),
  body: Joi.object({
    firstName: Joi.string().trim().min(1).max(80),
    lastName: Joi.string().trim().max(80).allow('', null),
    phone: Joi.string().allow('', null),
    roleId: Joi.string().uuid(),
  }).min(1),
};

const setStatus = {
  params: Joi.object({ id: Joi.string().uuid().required() }),
  body: Joi.object({
    status: Joi.string().valid(USER_STATUS.ACTIVE, USER_STATUS.SUSPENDED).required(),
  }),
};

const idParam = { params: Joi.object({ id: Joi.string().uuid().required() }) };

module.exports = { create, update, setStatus, idParam };
