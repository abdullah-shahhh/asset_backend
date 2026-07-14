'use strict';

const { mainDb } = require('../../database');
const tokenHelper = require('../../helpers/token.helper');
const cryptoHelper = require('../../helpers/crypto.helper');
const config = require('../../config');
const { TOKEN_TYPES, AUTH_REALM } = require('../../config/constants');
const ApiError = require('../../utils/ApiError');

/** Parse a duration string like "7d", "15m", "30s" into milliseconds. */
function durationToMs(str) {
  const match = /^(\d+)([smhd])$/.exec(String(str).trim());
  if (!match) return 0;
  const unit = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[match[2]];
  return Number(match[1]) * unit;
}

/**
 * Issue platform access + refresh tokens and persist the refresh token
 * (hashed) in the MAIN db so it can be rotated / revoked.
 */
async function generatePlatformAuthTokens(user, { req } = {}) {
  const tokens = tokenHelper.generatePlatformTokens(user);
  await mainDb.RefreshToken.create({
    userId: user.id,
    tokenHash: cryptoHelper.sha256(tokens.refresh),
    expiresAt: new Date(Date.now() + durationToMs(config.jwt.refresh.expiresIn)),
    userAgent: req?.headers?.['user-agent'] || null,
    ip: req?.ip || null,
  });
  return tokens;
}

/** Validate + rotate a platform refresh token, returning a fresh pair. */
async function rotatePlatformRefreshToken(refreshToken, { req } = {}) {
  let decoded;
  try {
    decoded = tokenHelper.verify(refreshToken, TOKEN_TYPES.REFRESH, { realm: AUTH_REALM.PLATFORM });
  } catch (err) {
    throw ApiError.unauthorized('Invalid refresh token');
  }

  const tokenHash = cryptoHelper.sha256(refreshToken);
  const stored = await mainDb.RefreshToken.findOne({ where: { tokenHash, userId: decoded.sub } });
  if (!stored || !stored.isActive()) throw ApiError.unauthorized('Refresh token expired or revoked');

  const user = await mainDb.User.findByPk(decoded.sub);
  if (!user || !user.isActive()) throw ApiError.unauthorized('User unavailable');

  stored.revokedAt = new Date();
  await stored.save();

  return generatePlatformAuthTokens(user, { req });
}

/** Revoke a specific refresh token (logout). */
async function revokeRefreshToken(refreshToken) {
  if (!refreshToken) return;
  const tokenHash = cryptoHelper.sha256(refreshToken);
  await mainDb.RefreshToken.update({ revokedAt: new Date() }, { where: { tokenHash, revokedAt: null } });
}

module.exports = {
  generatePlatformAuthTokens,
  rotatePlatformRefreshToken,
  revokeRefreshToken,
  durationToMs,
};
