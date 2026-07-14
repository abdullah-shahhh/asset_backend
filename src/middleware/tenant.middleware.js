'use strict';

const { mainDb, connectionManager } = require('../database');
const { ORGANIZATION_STATUS } = require('../config/constants');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');

/**
 * Load an organization by id and attach its tenant connection + models. Used
 * by superadmin "god-mode" drill-downs (e.g. GET /admin/organizations/:id/projects).
 *
 *   req.targetOrganization  the Organization record
 *   req.tenant               { sequelize, models }
 *   req.db                   shortcut to req.tenant.models
 *
 * @param {string} [param='organizationId'] route param holding the org id
 */
const attachOrganizationTenant = (param = 'organizationId') =>
  catchAsync(async (req, res, next) => {
    const organization = await mainDb.Organization.findByPk(req.params[param]);
    if (!organization) throw ApiError.notFound('Organization not found');
    if (!organization.isProvisioned) {
      throw ApiError.badRequest('Organization database is not provisioned yet');
    }

    const { sequelize, models } = await connectionManager.getConnection(organization);
    req.targetOrganization = organization;
    req.tenant = { sequelize, models };
    req.db = models;
    next();
  });

/**
 * Resolve the tenant for an ORG-realm request from the authenticated token's
 * organizationId. `authenticateOrg` already does this and attaches req.db —
 * this is a defensive re-check for routes composed differently.
 */
const resolveTenantFromToken = catchAsync(async (req, res, next) => {
  const organizationId = req.organization?.id || req.user?.organizationId;
  if (!organizationId) throw ApiError.badRequest('No organization context on this request');

  const organization = req.organization || (await mainDb.Organization.findByPk(organizationId));
  if (!organization) throw ApiError.notFound('Organization not found');
  if (organization.status !== ORGANIZATION_STATUS.ACTIVE) {
    throw ApiError.forbidden('Organization account is not active');
  }

  const { sequelize, models } = await connectionManager.getConnection(organization);
  req.organization = organization;
  req.tenant = { sequelize, models };
  req.db = models;
  next();
});

module.exports = { attachOrganizationTenant, resolveTenantFromToken };
