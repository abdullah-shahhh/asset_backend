'use strict';

const { mainDb } = require('../../database');
const { randomToken } = require('../../helpers/crypto.helper');
const ApiError = require('../../utils/ApiError');

const MAX_HOURS = 24 * 30; // 30 days — a "temporary" link, not a permanent one

/** Create a new share link for a project. `models` is the caller's own
 * tenant connection, used only to confirm the project actually exists in
 * their org before minting a link for it. `expiresInHours: null` means
 * "forever, until I revoke it" — explicit, not a default. */
async function create(models, organization, userId, { projectId, expiresInHours, label }) {
  const project = await models.Project.findByPk(projectId);
  if (!project) throw ApiError.notFound('Project not found');

  let expiresAt = null;
  if (expiresInHours !== null && expiresInHours !== undefined) {
    const hours = Math.min(Math.max(Number(expiresInHours), 1), MAX_HOURS);
    expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
  }

  return mainDb.ShareLink.create({
    organizationId: organization.id,
    projectId,
    token: randomToken(24),
    createdByUserId: userId,
    label: label || null,
    expiresAt,
  });
}

/** All share links (active and expired/revoked) for a project — so a
 * manager can see what's out there and revoke anything they no longer want
 * shared. */
async function listForProject(organization, projectId) {
  return mainDb.ShareLink.findAll({
    where: { organizationId: organization.id, projectId },
    order: [['createdAt', 'DESC']],
  });
}

async function revoke(organization, id) {
  const link = await mainDb.ShareLink.findOne({ where: { id, organizationId: organization.id } });
  if (!link) throw ApiError.notFound('Share link not found');
  await link.update({ revokedAt: new Date() });
  return link;
}

/** Resolve a public token to its organization + project scope, or throw.
 * Bumps the lightweight view counter so the owner has *some* visibility
 * into "is anyone actually using this" without full per-viewer tracking. */
async function resolveToken(token) {
  const link = await mainDb.ShareLink.findOne({ where: { token } });
  if (!link || !link.isActive()) throw ApiError.notFound('This link is invalid or has expired');
  const organization = await mainDb.Organization.findByPk(link.organizationId);
  if (!organization || organization.status !== 'active') throw ApiError.notFound('This link is invalid or has expired');
  link.update({ viewCount: link.viewCount + 1, lastViewedAt: new Date() }).catch(() => {});
  return { link, organization };
}

module.exports = { create, listForProject, revoke, resolveToken };
