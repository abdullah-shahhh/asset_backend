'use strict';

const { ValidationError, UniqueConstraintError, DatabaseError, BaseError } = require('sequelize');
const ApiError = require('../utils/ApiError');
const config = require('../config');
const logger = require('../config/logger');
const responseHelper = require('../helpers/response.helper');

/** 404 handler for unmatched routes. */
function notFound(req, res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

/** Normalise any thrown value into an ApiError. */
function normalizeError(err) {
  if (err instanceof ApiError) return err;

  if (err instanceof UniqueConstraintError) {
    const errors = (err.errors || []).map((e) => ({ field: e.path, message: e.message }));
    return new ApiError(409, 'Resource already exists', { errors });
  }
  if (err instanceof ValidationError) {
    const errors = (err.errors || []).map((e) => ({ field: e.path, message: e.message }));
    return new ApiError(422, 'Validation failed', { errors });
  }
  if (err instanceof DatabaseError || err instanceof BaseError) {
    return new ApiError(500, 'Database error', { isOperational: false, stack: err.stack });
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return new ApiError(401, 'Invalid or expired token');
  }

  if (err.type === 'entity.parse.failed') {
    return new ApiError(400, 'Malformed JSON in request body');
  }

  if (err.name === 'MulterError') {
    return new ApiError(400, err.message);
  }

  const statusCode = err.statusCode || 500;
  return new ApiError(statusCode, err.message || 'Internal Server Error', {
    isOperational: false,
    stack: err.stack,
  });
}

/** Central error handler. Must be registered LAST. */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const apiError = normalizeError(err);

  if (!apiError.isOperational || apiError.statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} -> ${apiError.statusCode}: ${apiError.message}`);
    if (apiError.stack) logger.error(apiError.stack);
  } else {
    logger.warn(`${req.method} ${req.originalUrl} -> ${apiError.statusCode}: ${apiError.message}`);
  }

  const body = {
    statusCode: apiError.statusCode,
    message: apiError.message,
    errors: apiError.errors,
  };
  if (!config.isProd && apiError.stack) {
    body.stack = apiError.stack;
  }

  return responseHelper.error(res, body);
}

module.exports = { notFound, errorHandler, normalizeError };
