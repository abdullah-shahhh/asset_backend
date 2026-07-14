'use strict';

const { mainDb } = require('../../database');
const tokenService = require('./token.service');
const auditHelper = require('../../helpers/audit.helper');
const { AUDIT_ACTIONS, USER_STATUS, AUTH_REALM } = require('../../config/constants');
const ApiError = require('../../utils/ApiError');

/** Authenticate a platform (superadmin/staff) user with email + password. */
async function login({ email, password }, { req } = {}) {
  const user = await mainDb.User.scope('withPassword').findOne({
    where: { email },
    include: [{ association: 'role' }],
  });
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Incorrect email or password');
  }
  if (user.status !== USER_STATUS.ACTIVE) throw ApiError.forbidden('Account is not active');

  user.lastLoginAt = new Date();
  await user.save();

  const tokens = await tokenService.generatePlatformAuthTokens(user, { req });
  auditHelper.record({
    action: AUDIT_ACTIONS.LOGIN,
    entity: 'User',
    entityId: user.id,
    actorId: user.id,
    actorRealm: AUTH_REALM.PLATFORM,
    req,
  });

  return { user: await me(user.id), tokens };
}

/** Exchange a platform refresh token for a new pair. */
async function refresh(refreshToken, { req } = {}) {
  const tokens = await tokenService.rotatePlatformRefreshToken(refreshToken, { req });
  return { tokens };
}

/** Logout: revoke the supplied refresh token. */
async function logout(refreshToken, { req } = {}) {
  await tokenService.revokeRefreshToken(refreshToken);
  if (req?.user) {
    auditHelper.record({
      action: AUDIT_ACTIONS.LOGOUT,
      entity: 'User',
      entityId: req.user.id,
      actorRealm: AUTH_REALM.PLATFORM,
      req,
    });
  }
}

/** Current authenticated platform user with role + permission keys. */
async function me(userId) {
  const user = await mainDb.User.findByPk(userId, {
    include: [{ association: 'role', include: [{ association: 'permissions' }] }],
  });
  if (!user) throw ApiError.notFound('User not found');
  const json = user.toJSON();
  json.permissions = (user.role?.permissions || []).map((p) => p.key);
  if (json.role) delete json.role.permissions;
  return json;
}

module.exports = { login, refresh, logout, me };
