'use strict';

const { mainDb } = require('../../database');
const auditHelper = require('../../helpers/audit.helper');
const { AUDIT_ACTIONS } = require('../../config/constants');
const ApiError = require('../../utils/ApiError');

const { Module, OrganizationModule, Organization } = mainDb;

async function list() {
  return Module.findAll({ order: [['name', 'ASC']] });
}

async function listForOrganization(organizationId) {
  const rows = await OrganizationModule.findAll({
    where: { organizationId },
    include: [{ association: 'module' }],
  });
  return rows.map((r) => r.module);
}

/** Enable a module for an organization (doc §3.3 "module marketplace"). */
async function enableForOrganization(organizationId, moduleId, { req } = {}) {
  const [organization, module_] = await Promise.all([
    Organization.findByPk(organizationId),
    Module.findByPk(moduleId),
  ]);
  if (!organization) throw ApiError.notFound('Organization not found');
  if (!module_) throw ApiError.notFound('Module not found');

  const [link] = await OrganizationModule.findOrCreate({
    where: { organizationId, moduleId },
    defaults: { organizationId, moduleId },
  });

  auditHelper.record({
    action: AUDIT_ACTIONS.MODULE_ENABLE,
    entity: 'Module',
    entityId: moduleId,
    organizationId,
    metadata: { moduleKey: module_.key },
    req,
  });

  return link;
}

async function disableForOrganization(organizationId, moduleId, { req } = {}) {
  await OrganizationModule.destroy({ where: { organizationId, moduleId } });
  auditHelper.record({
    action: AUDIT_ACTIONS.MODULE_DISABLE,
    entity: 'Module',
    entityId: moduleId,
    organizationId,
    req,
  });
  return true;
}

module.exports = { list, listForOrganization, enableForOrganization, disableForOrganization };
