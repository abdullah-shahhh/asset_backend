'use strict';

const catchAsync = require('../../utils/catchAsync');
const shareLinkService = require('../../services/org/shareLink.service');
const response = require('../../helpers/response.helper');
const config = require('../../config');

function toPublicShape(link) {
  return {
    id: link.id,
    projectId: link.projectId,
    label: link.label,
    url: `${config.clientUrl}/share/${link.token}`,
    expiresAt: link.expiresAt,
    revokedAt: link.revokedAt,
    isActive: link.isActive(),
    viewCount: link.viewCount,
    lastViewedAt: link.lastViewedAt,
    createdAt: link.createdAt,
  };
}

const create = catchAsync(async (req, res) => {
  const link = await shareLinkService.create(req.db, req.organization, req.user.id, req.body);
  return response.created(res, { message: 'Share link created', data: toPublicShape(link) });
});

const list = catchAsync(async (req, res) => {
  const links = await shareLinkService.listForProject(req.organization, req.query.projectId);
  return response.success(res, { data: links.map(toPublicShape) });
});

const revoke = catchAsync(async (req, res) => {
  await shareLinkService.revoke(req.organization, req.params.id);
  return response.success(res, { message: 'Share link revoked' });
});

module.exports = { create, list, revoke };
