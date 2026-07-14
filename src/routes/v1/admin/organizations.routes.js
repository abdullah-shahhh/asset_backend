'use strict';

const express = require('express');
const ctrl = require('../../../controllers/admin/organization.controller');
const moduleCtrl = require('../../../controllers/admin/module.controller');
const v = require('../../../validations/admin/organization.validation');
const { validate } = require('../../../middleware/validate.middleware');
const { requirePermission } = require('../../../middleware/permission.middleware');
const { attachOrganizationTenant } = require('../../../middleware/tenant.middleware');
const { PERMISSIONS } = require('../../../config/constants');

const router = express.Router();

router.get('/', requirePermission(PERMISSIONS.ORGANIZATIONS_VIEW), ctrl.list);
router.post('/', requirePermission(PERMISSIONS.ORGANIZATIONS_CREATE), validate(v.create), ctrl.create);
router.get('/:id', requirePermission(PERMISSIONS.ORGANIZATIONS_VIEW), validate(v.idParam), ctrl.get);
router.patch('/:id', requirePermission(PERMISSIONS.ORGANIZATIONS_UPDATE), validate(v.update), ctrl.update);
router.post('/:id/suspend', requirePermission(PERMISSIONS.ORGANIZATIONS_SUSPEND), validate(v.suspend), ctrl.suspend);
router.post('/:id/restore', requirePermission(PERMISSIONS.ORGANIZATIONS_SUSPEND), validate(v.idParam), ctrl.restore);

// Module marketplace — enable/disable per organization.
router.get(
  '/:organizationId/modules',
  requirePermission(PERMISSIONS.MODULES_VIEW),
  validate(v.drillDownParams),
  moduleCtrl.listForOrganization
);
router.post(
  '/:organizationId/modules/:moduleId',
  requirePermission(PERMISSIONS.MODULES_MANAGE),
  validate(v.moduleParam),
  moduleCtrl.enableForOrganization
);
router.delete(
  '/:organizationId/modules/:moduleId',
  requirePermission(PERMISSIONS.MODULES_MANAGE),
  validate(v.moduleParam),
  moduleCtrl.disableForOrganization
);

// God-mode drill-down into the organization's tenant DB.
router.get(
  '/:organizationId/projects',
  requirePermission(PERMISSIONS.ORGANIZATIONS_VIEW_PROJECTS),
  validate(v.drillDownParams),
  attachOrganizationTenant(),
  ctrl.listProjects
);
router.get(
  '/:organizationId/network-assets',
  requirePermission(PERMISSIONS.ORGANIZATIONS_VIEW_ASSETS),
  validate(v.drillDownParams),
  attachOrganizationTenant(),
  ctrl.listNetworkAssets
);
router.get(
  '/:organizationId/users',
  requirePermission(PERMISSIONS.ORGANIZATIONS_VIEW_USERS),
  validate(v.drillDownParams),
  attachOrganizationTenant(),
  ctrl.listUsers
);

module.exports = router;
