'use strict';

const { Joi } = require('../../middleware/validate.middleware');

const login = {
  body: Joi.object({
    email: Joi.string().email({ tlds: { allow: false } }).required(),
    password: Joi.string().required(),
  }),
};

const refresh = {
  body: Joi.object({ refreshToken: Joi.string().required() }),
};

const logout = {
  body: Joi.object({ refreshToken: Joi.string().required() }),
};

module.exports = { login, refresh, logout };
