'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config');
const { TOKEN_TYPES, AUTH_REALM } = require('../config/constants');

const SECRETS = {
  [TOKEN_TYPES.ACCESS]: config.jwt.access,
  [TOKEN_TYPES.REFRESH]: config.jwt.refresh,
};

/**
 * Sign a JWT. The `type` (purpose) and `realm` (platform vs org) claims are
 * embedded so a token can't be replayed across purpose or tenant boundary.
 */
function sign(payload, type = TOKEN_TYPES.ACCESS, overrides = {}) {
  const cfg = SECRETS[type];
  if (!cfg) throw new Error(`Unknown token type: ${type}`);
  return jwt.sign({ ...payload, type }, cfg.secret, { expiresIn: cfg.expiresIn, ...overrides });
}

/**
 * Verify a JWT and assert its embedded type (and optionally realm).
 */
function verify(token, type = TOKEN_TYPES.ACCESS, { realm } = {}) {
  const cfg = SECRETS[type];
  if (!cfg) throw new Error(`Unknown token type: ${type}`);
  const decoded = jwt.verify(token, cfg.secret);
  if (decoded.type !== type) throw new jwt.JsonWebTokenError('Invalid token type');
  if (realm && decoded.realm !== realm) throw new jwt.JsonWebTokenError('Invalid token realm');
  return decoded;
}

/**
 * Issue an access + refresh token pair for a platform (superadmin) user.
 */
function generatePlatformTokens(user) {
  const payload = { sub: user.id, realm: AUTH_REALM.PLATFORM, roleId: user.roleId };
  return {
    access: sign(payload, TOKEN_TYPES.ACCESS),
    refresh: sign({ sub: user.id, realm: AUTH_REALM.PLATFORM }, TOKEN_TYPES.REFRESH),
  };
}

/**
 * Issue tokens for an organization (tenant) staff user. organizationId lets
 * the API resolve the tenant DB on subsequent requests.
 */
function generateOrgTokens(user, organizationId) {
  const payload = { sub: user.id, realm: AUTH_REALM.ORG, organizationId, roleId: user.roleId };
  return {
    access: sign(payload, TOKEN_TYPES.ACCESS),
    refresh: sign({ sub: user.id, realm: AUTH_REALM.ORG, organizationId }, TOKEN_TYPES.REFRESH),
  };
}

module.exports = {
  sign,
  verify,
  generatePlatformTokens,
  generateOrgTokens,
  TOKEN_TYPES,
  AUTH_REALM,
};
