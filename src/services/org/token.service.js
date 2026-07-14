'use strict';

const tokenHelper = require('../../helpers/token.helper');
const cryptoHelper = require('../../helpers/crypto.helper');
const config = require('../../config');
const { TOKEN_TYPES, AUTH_REALM } = require('../../config/constants');
const ApiError = require('../../utils/ApiError');

function durationToMs(str) {
  const match = /^(\d+)([smhd])$/.exec(String(str).trim());
  if (!match) return 0;
  const unit = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[match[2]];
  return Number(match[1]) * unit;
}

/**
 * Issue org access + refresh tokens and persist the refresh token (hashed)
 * in the ORGANIZATION's tenant DB so it can be rotated / revoked.
 * @param {object} models tenant models (req.db)
 * @param {object} user   tenant User instance
 * @param {string} organizationId
 */
async function generateOrgAuthTokens(models, user, organizationId, { req } = {}) {
  const tokens = tokenHelper.generateOrgTokens(user, organizationId);
  await models.RefreshToken.create({
    userId: user.id,
    tokenHash: cryptoHelper.sha256(tokens.refresh),
    expiresAt: new Date(Date.now() + durationToMs(config.jwt.refresh.expiresIn)),
    userAgent: req?.headers?.['user-agent'] || null,
    ip: req?.ip || null,
  });
  return tokens;
}

/**
 * Decode + verify an org refresh token WITHOUT touching any tenant DB (the
 * JWT secret is global, not per-org) — used to learn which organization's
 * tenant DB to resolve before we can look anything up.
 */
function decodeRefreshToken(refreshToken) {
  try {
    return tokenHelper.verify(refreshToken, TOKEN_TYPES.REFRESH, { realm: AUTH_REALM.ORG });
  } catch (err) {
    throw ApiError.unauthorized('Invalid refresh token');
  }
}

/** Validate + rotate an org refresh token, returning a fresh pair. */
async function rotateOrgRefreshToken(models, refreshToken, organizationId, { req } = {}) {
  const decoded = decodeRefreshToken(refreshToken);
  if (decoded.organizationId !== organizationId) throw ApiError.unauthorized('Invalid refresh token');

  const tokenHash = cryptoHelper.sha256(refreshToken);
  const stored = await models.RefreshToken.findOne({ where: { tokenHash, userId: decoded.sub } });
  if (!stored || !stored.isActive()) throw ApiError.unauthorized('Refresh token expired or revoked');

  const user = await models.User.findByPk(decoded.sub);
  if (!user || !user.isActive()) throw ApiError.unauthorized('User unavailable');

  stored.revokedAt = new Date();
  await stored.save();

  return generateOrgAuthTokens(models, user, organizationId, { req });
}

/** Revoke a specific refresh token (logout). */
async function revokeRefreshToken(models, refreshToken) {
  if (!refreshToken) return;
  const tokenHash = cryptoHelper.sha256(refreshToken);
  await models.RefreshToken.update({ revokedAt: new Date() }, { where: { tokenHash, revokedAt: null } });
}

module.exports = { generateOrgAuthTokens, rotateOrgRefreshToken, revokeRefreshToken, decodeRefreshToken, durationToMs };
