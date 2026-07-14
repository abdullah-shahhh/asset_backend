'use strict';

const Joi = require('joi');
const ApiError = require('../utils/ApiError');

/**
 * Validate request segments against a Joi schema map.
 * Usage:
 *   router.post('/', validate({ body: createSchema, query: ..., params: ... }), handler)
 *
 * Validated (and coerced) values replace req.body / req.query / req.params.
 */
const validate = (schema) => (req, res, next) => {
  const segments = ['params', 'query', 'body'];
  const errors = [];

  segments.forEach((segment) => {
    if (!schema[segment]) return;
    const { value, error } = schema[segment].validate(req[segment], {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      error.details.forEach((d) => {
        errors.push({ field: d.path.join('.'), message: d.message.replace(/"/g, ''), in: segment });
      });
    } else {
      // In Express 5 req.query/req.params are getter-only, so redefine the
      // property with the validated (coerced, stripped) value.
      Object.defineProperty(req, segment, {
        value,
        writable: true,
        enumerable: true,
        configurable: true,
      });
    }
  });

  if (errors.length) {
    return next(ApiError.unprocessable('Validation failed', errors));
  }
  return next();
};

module.exports = { validate, Joi };
