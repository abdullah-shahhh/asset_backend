'use strict';

/**
 * Operational error with an HTTP status code. Anything thrown as an ApiError
 * is considered "expected" and is surfaced to the client by the error handler.
 */
class ApiError extends Error {
  constructor(statusCode, message, { errors = null, isOperational = true, stack = '' } = {}) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = isOperational;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  static badRequest(message = 'Bad Request', errors = null) {
    return new ApiError(400, message, { errors });
  }

  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Forbidden') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Not Found') {
    return new ApiError(404, message);
  }

  static conflict(message = 'Conflict') {
    return new ApiError(409, message);
  }

  static unprocessable(message = 'Unprocessable Entity', errors = null) {
    return new ApiError(422, message, { errors });
  }

  static tooMany(message = 'Too Many Requests') {
    return new ApiError(429, message);
  }

  static internal(message = 'Internal Server Error') {
    return new ApiError(500, message, { isOperational: false });
  }
}

module.exports = ApiError;
