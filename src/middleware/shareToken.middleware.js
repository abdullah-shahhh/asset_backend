'use strict';

const { connectionManager } = require('../database');
const shareLinkService = require('../services/org/shareLink.service');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');

/**
 * Public-route equivalent of authenticateOrg — resolves an anonymous
 * request's :token param to a tenant connection instead of verifying a JWT.
 * Attaches:
 *   req.db          tenant models (same shape authenticated routes get)
 *   req.shareLink   { id, projectId } — every handler behind this MUST
 *                   scope its query to this projectId; nothing else in the
 *                   org is reachable through a share link.
 */
const resolveShareToken = catchAsync(async (req, res, next) => {
  const { token } = req.params;
  if (!token) throw ApiError.notFound('This link is invalid or has expired');

  const { link, organization } = await shareLinkService.resolveToken(token);
  const { models } = await connectionManager.getConnection(organization);

  req.db = models;
  req.organization = organization;
  req.shareLink = { id: link.id, projectId: link.projectId, expiresAt: link.expiresAt };
  next();
});

module.exports = { resolveShareToken };
