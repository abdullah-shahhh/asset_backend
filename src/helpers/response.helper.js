'use strict';

/**
 * Standard API envelope so every response has a predictable shape for the
 * frontend:  { success, message, data, meta, errors }
 */

function success(res, { statusCode = 200, message = 'Success', data = null, meta = null } = {}) {
  const payload = { success: true, message, data };
  if (meta) payload.meta = meta;
  return res.status(statusCode).json(payload);
}

function created(res, { message = 'Created', data = null } = {}) {
  return success(res, { statusCode: 201, message, data });
}

function noContent(res) {
  return res.status(204).send();
}

function paginated(res, { message = 'Success', data = [], pagination }) {
  return success(res, { statusCode: 200, message, data, meta: { pagination } });
}

function error(res, { statusCode = 500, message = 'Error', errors = null } = {}) {
  const payload = { success: false, message };
  if (errors) payload.errors = errors;
  return res.status(statusCode).json(payload);
}

module.exports = { success, created, noContent, paginated, error };
