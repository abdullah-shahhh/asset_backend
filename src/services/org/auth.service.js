'use strict';

const { mainDb, connectionManager } = require('../../database');
const orgDirectory = require('../shared/org-directory.service');
const tokenService = require('./token.service');
const auditHelper = require('../../helpers/audit.helper');
const { AUDIT_ACTIONS, USER_STATUS, ORGANIZATION_STATUS, AUTH_REALM } = require('../../config/constants');
const ApiError = require('../../utils/ApiError');

/**
 * Authenticate an org staff user with email + password alone (no org slug —
 * resolved via the global login directory).
 */
async function login({ email, password }, { req } = {}) {
  const organizationId = await orgDirectory.resolveOrganizationId(email);
  if (!organizationId) throw ApiError.unauthorized('Incorrect email or password');

  const organization = await mainDb.Organization.findByPk(organizationId);
  if (!organization || organization.status !== ORGANIZATION_STATUS.ACTIVE) {
    throw ApiError.forbidden('Organization account is not active');
  }

  const { models } = await connectionManager.getConnection(organization);
  const user = await models.User.scope('withPassword').findOne({
    where: { email: orgDirectory.normalize(email) },
    include: [{ association: 'role' }],
  });
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Incorrect email or password');
  }
  if (user.status !== USER_STATUS.ACTIVE) throw ApiError.forbidden('Account is not active');

  user.lastLoginAt = new Date();
  await user.save();

  const tokens = await tokenService.generateOrgAuthTokens(models, user, organization.id, { req });
  auditHelper.record({
    action: AUDIT_ACTIONS.LOGIN,
    entity: 'User',
    entityId: user.id,
    actorId: user.id,
    actorRealm: AUTH_REALM.ORG,
    organizationId: organization.id,
    req,
  });

  return {
    organization: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      logoUrl: organization.logoUrl,
      primaryColor: organization.primaryColor,
      secondaryColor: organization.secondaryColor,
      textPrimaryColor: organization.textPrimaryColor,
      textSecondaryColor: organization.textSecondaryColor,
    },
    user: await me(models, user.id),
    tokens,
  };
}

/** Exchange an org refresh token for a new pair. The token itself carries
 * organizationId (JWT secret is global, so it can be decoded before we know
 * which tenant DB to resolve). */
async function refresh(refreshToken, { req } = {}) {
  const decoded = tokenService.decodeRefreshToken(refreshToken);
  const organization = await mainDb.Organization.findByPk(decoded.organizationId);
  if (!organization) throw ApiError.unauthorized('Organization no longer exists');
  const { models } = await connectionManager.getConnection(organization);
  const tokens = await tokenService.rotateOrgRefreshToken(models, refreshToken, organization.id, { req });
  return { tokens };
}

/** Logout: revoke the supplied refresh token. */
async function logout(refreshToken, { req } = {}) {
  if (!refreshToken) return;
  let decoded;
  try {
    decoded = tokenService.decodeRefreshToken(refreshToken);
  } catch (err) {
    return; // already invalid/expired — nothing to revoke
  }
  const organization = await mainDb.Organization.findByPk(decoded.organizationId);
  if (!organization) return;
  const { models } = await connectionManager.getConnection(organization);
  await tokenService.revokeRefreshToken(models, refreshToken);
  auditHelper.record({
    action: AUDIT_ACTIONS.LOGOUT,
    entity: 'User',
    entityId: decoded.sub,
    actorRealm: AUTH_REALM.ORG,
    organizationId: organization.id,
    req,
  });
}

/** Current authenticated org user with role + permission keys. */
async function me(models, userId) {
  const user = await models.User.findByPk(userId, {
    include: [{ association: 'role', include: [{ association: 'permissions' }] }],
  });
  if (!user) throw ApiError.notFound('User not found');
  const json = user.toJSON();
  json.permissions = (user.role?.permissions || []).map((p) => p.key);
  if (json.role) delete json.role.permissions;
  return json;
}

module.exports = { login, refresh, logout, me };
