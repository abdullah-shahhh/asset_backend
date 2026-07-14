'use strict';

const { mainDb } = require('../../database');
const ApiError = require('../../utils/ApiError');

/**
 * Global org-staff login directory: maps an email to the organization
 * (tenant DB) that owns the account, so org staff can log into the client
 * panel with email + password alone (no org slug at login). One email = one
 * organization (a person works for one org).
 */

/** Normalize an email for storage/lookup (trim + lowercase). */
function normalize(email) {
  return String(email || '').trim().toLowerCase();
}

/** Resolve which organization an email belongs to. Returns organizationId or null. */
async function resolveOrganizationId(email) {
  const e = normalize(email);
  if (!e) return null;
  const row = await mainDb.OrgUserDirectory.findOne({ where: { email: e } });
  return row ? row.organizationId : null;
}

/**
 * Register an email -> organization mapping. Idempotent for the same org;
 * throws 409 if the email already belongs to a different organization.
 */
async function register(email, organizationId, { transaction } = {}) {
  const e = normalize(email);
  if (!e) return null;

  const sameOrg = await mainDb.OrgUserDirectory.findOne({ where: { email: e, organizationId } });
  if (sameOrg) return sameOrg;

  const other = await mainDb.OrgUserDirectory.findOne({ where: { email: e } });
  if (other) throw ApiError.conflict('This email is already registered on the platform');

  return mainDb.OrgUserDirectory.create({ email: e, organizationId }, { transaction });
}

/** Remove an email from the directory (org-scoped). */
async function remove(email, organizationId) {
  const e = normalize(email);
  if (!e) return;
  const where = { email: e };
  if (organizationId) where.organizationId = organizationId;
  await mainDb.OrgUserDirectory.destroy({ where });
}

/** Remove every directory entry for an organization (e.g. when it's deleted). */
async function removeAllForOrganization(organizationId) {
  await mainDb.OrgUserDirectory.destroy({ where: { organizationId } });
}

module.exports = { normalize, resolveOrganizationId, register, remove, removeAllForOrganization };
