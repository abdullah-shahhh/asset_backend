'use strict';

const tokenHelper = require('../helpers/token.helper');
const { TOKEN_TYPES, AUTH_REALM } = require('../config/constants');
const { mainDb, connectionManager } = require('../database');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');

/** Extract a Bearer token from the Authorization header. */
function getTokenFromRequest(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : null;
}

/**
 * Authenticate a PLATFORM (superadmin) request. Verifies the access token,
 * loads the user with role + permissions, and attaches:
 *   req.user            the User instance (with `role`)
 *   req.permissions     Set<string> of permission keys
 *   req.isSuperAdmin    boolean (bypasses per-permission checks)
 *   req.authRealm       'platform'
 */
const authenticatePlatform = catchAsync(async (req, res, next) => {
  const token = getTokenFromRequest(req);
  if (!token) throw ApiError.unauthorized('Authentication token missing');

  let decoded;
  try {
    decoded = tokenHelper.verify(token, TOKEN_TYPES.ACCESS, { realm: AUTH_REALM.PLATFORM });
  } catch (err) {
    throw ApiError.unauthorized('Invalid or expired token');
  }

  const user = await mainDb.User.findByPk(decoded.sub, {
    include: [{ association: 'role', include: [{ association: 'permissions' }] }],
  });
  if (!user) throw ApiError.unauthorized('User no longer exists');
  if (!user.isActive()) throw ApiError.forbidden('Account is not active');
  if (!user.role || !user.role.isActive) throw ApiError.forbidden('Role is inactive');

  req.user = user;
  req.token = token;
  req.authRealm = AUTH_REALM.PLATFORM;
  req.isSuperAdmin = Boolean(user.role.isSuperAdmin);
  req.permissions = new Set((user.role.permissions || []).map((p) => p.key));
  next();
});

/**
 * Authenticate an ORG (client panel / future mobile) request. Verifies the
 * access token, resolves the organization's tenant connection from the
 * token's `organizationId` claim, and loads the user + role + permissions
 * from that tenant DB. Attaches:
 *   req.organization    the Organization instance (MAIN db record)
 *   req.tenant          { sequelize, models }
 *   req.db              shortcut to req.tenant.models
 *   req.user            the tenant User instance (with `role`)
 *   req.permissions     Set<string> of permission keys
 *   req.isSuperAdmin    boolean (Org Admin role bypasses per-permission checks)
 *   req.authRealm       'org'
 */
const authenticateOrg = catchAsync(async (req, res, next) => {
  const token = getTokenFromRequest(req);
  if (!token) throw ApiError.unauthorized('Authentication token missing');

  let decoded;
  try {
    decoded = tokenHelper.verify(token, TOKEN_TYPES.ACCESS, { realm: AUTH_REALM.ORG });
  } catch (err) {
    throw ApiError.unauthorized('Invalid or expired token');
  }

  const organization = await mainDb.Organization.findByPk(decoded.organizationId);
  if (!organization) throw ApiError.unauthorized('Organization no longer exists');
  if (organization.status !== 'active') throw ApiError.forbidden('Organization account is not active');

  const { sequelize, models } = await connectionManager.getConnection(organization);

  const user = await models.User.findByPk(decoded.sub, {
    include: [{ association: 'role', include: [{ association: 'permissions' }] }],
  });
  if (!user) throw ApiError.unauthorized('User no longer exists');
  if (!user.isActive()) throw ApiError.forbidden('Account is not active');
  if (!user.role || !user.role.isActive) throw ApiError.forbidden('Role is inactive');

  req.organization = organization;
  req.tenant = { sequelize, models };
  req.db = models;
  req.user = user;
  req.token = token;
  req.authRealm = AUTH_REALM.ORG;
  req.isSuperAdmin = Boolean(user.role.isSuperAdmin);
  req.permissions = new Set((user.role.permissions || []).map((p) => p.key));
  next();
});

module.exports = { authenticatePlatform, authenticateOrg, getTokenFromRequest };
