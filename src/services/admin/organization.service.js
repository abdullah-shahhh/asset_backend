'use strict';

const { mainDb, connectionManager } = require('../../database');
const { paginate, getPaginationParams, buildPaginationMeta } = require('../../helpers/pagination.helper');
const { ORGANIZATION_STATUS, AUDIT_ACTIONS } = require('../../config/constants');
const config = require('../../config');
const logger = require('../../config/logger');
const ApiError = require('../../utils/ApiError');
const provisioningService = require('./provisioning.service');
const orgDirectory = require('../shared/org-directory.service');
const auditHelper = require('../../helpers/audit.helper');
const { uniqueJoinCode } = require('../../helpers/code.helper');

const { Organization } = mainDb;

function slugify(str) {
  return String(str).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

async function uniqueSlug(base) {
  let slug = slugify(base);
  let i = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await Organization.findOne({ where: { slug }, paranoid: false })) {
    slug = `${slugify(base)}-${i}`;
    i += 1;
  }
  return slug;
}

/**
 * Superadmin: create an organization and provision its tenant database
 * immediately (doc §5.3 automated provisioning pipeline).
 * @param {object} payload organization details + adminUser
 */
async function create(payload, { req } = {}) {
  const { adminUser, ...details } = payload;

  const slug = await uniqueSlug(details.slug || details.name);
  const dbName = `${config.db.tenant.prefix}${slug}`;
  const joinCode = await uniqueJoinCode();

  const organization = await Organization.create({
    name: details.name,
    slug,
    dbName,
    joinCode,
    email: details.email,
    contactName: details.contactName,
    contactPhone: details.contactPhone,
    address: details.address,
    country: details.country,
    timezone: details.timezone || 'UTC',
    status: ORGANIZATION_STATUS.PENDING,
  });

  await provisioningService.provision(organization, adminUser);
  await organization.update({ status: ORGANIZATION_STATUS.ACTIVE });

  auditHelper.record({
    action: AUDIT_ACTIONS.PROVISION,
    entity: 'Organization',
    entityId: organization.id,
    organizationId: organization.id,
    req,
  });

  return getById(organization.id);
}

async function list(query) {
  const where = {};
  if (query.status) where.status = query.status;
  if (query.search) {
    where.name = { [mainDb.Sequelize.Op.iLike]: `%${query.search}%` };
  }
  const { rows, pagination } = await paginate(Organization, query, { where });
  return { organizations: rows, pagination };
}

async function getById(id) {
  const organization = await Organization.findByPk(id, {
    include: [{ association: 'organizationModules', include: [{ association: 'module' }] }],
  });
  if (!organization) throw ApiError.notFound('Organization not found');
  return organization;
}

/** Full profile: organization + live usage counts from its tenant DB. */
async function getOverview(id) {
  const organization = await getById(id);
  let usage = { projects: 0, networkAssets: 0, users: 0 };

  if (organization.isProvisioned) {
    try {
      const { models } = await connectionManager.getConnection(organization);
      const [projects, networkAssets, users] = await Promise.all([
        models.Project.count(),
        models.NetworkAsset.count(),
        models.User.count(),
      ]);
      usage = { projects, networkAssets, users };
    } catch (err) {
      logger.warn(`Usage counts unavailable for ${organization.slug}: ${err.message}`);
    }
  }

  return { organization, usage };
}

/* ---------------------------------------------------------------------------
 * God-mode tenant drill-downs
 * ------------------------------------------------------------------------- */

async function paginateTenant(organization, modelName, query, options = {}) {
  if (!organization.isProvisioned) throw ApiError.badRequest('Organization database is not provisioned');
  const { models } = await connectionManager.getConnection(organization);
  const model = models[modelName];
  if (!model) throw ApiError.badRequest(`Unknown tenant model: ${modelName}`);

  const { page, limit, offset, order } = getPaginationParams(query);
  const { count, rows } = await model.findAndCountAll({ ...options, limit, offset, order });
  return { rows, pagination: buildPaginationMeta(count, page, limit) };
}

const listProjects = (organization, query) => paginateTenant(organization, 'Project', query);
const listNetworkAssets = (organization, query) =>
  paginateTenant(organization, 'NetworkAsset', query, { include: [{ association: 'project', attributes: ['id', 'name'] }] });
const listOrgUsers = (organization, query) =>
  paginateTenant(organization, 'User', query, { include: [{ association: 'role' }] });

/* ---------------------------------------------------------------------------
 * Status transitions (status-based, no hard delete)
 * ------------------------------------------------------------------------- */

async function suspend(id, { reason } = {}, { req } = {}) {
  const organization = await getById(id);
  if (organization.status === ORGANIZATION_STATUS.DELETED) throw ApiError.badRequest('Organization is deleted');

  await organization.update({
    status: ORGANIZATION_STATUS.SUSPENDED,
    suspendedAt: new Date(),
    suspendReason: reason || null,
  });
  auditHelper.record({ action: AUDIT_ACTIONS.SUSPEND, entity: 'Organization', entityId: id, organizationId: id, req });
  return getById(id);
}

async function restore(id, { req } = {}) {
  const organization = await getById(id);
  await organization.update({ status: ORGANIZATION_STATUS.ACTIVE, suspendedAt: null, suspendReason: null });
  auditHelper.record({ action: AUDIT_ACTIONS.RESTORE, entity: 'Organization', entityId: id, organizationId: id, req });
  return getById(id);
}

async function update(id, data, { req } = {}) {
  const organization = await getById(id);
  const allowed = ['name', 'email', 'contactName', 'contactPhone', 'address', 'country', 'timezone'];
  const patch = {};
  allowed.forEach((k) => {
    if (data[k] !== undefined) patch[k] = data[k];
  });
  await organization.update(patch);
  auditHelper.record({ action: AUDIT_ACTIONS.UPDATE, entity: 'Organization', entityId: id, organizationId: id, req });
  return getById(id);
}

module.exports = {
  create,
  list,
  getById,
  getOverview,
  listProjects,
  listNetworkAssets,
  listOrgUsers,
  suspend,
  restore,
  update,
};
