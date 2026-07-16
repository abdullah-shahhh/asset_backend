'use strict';

const express = require('express');
const ctrl = require('../../../controllers/org/project.controller');
const symbologyCtrl = require('../../../controllers/org/symbology.controller');
const v = require('../../../validations/org/project.validation');
const symbologyValidation = require('../../../validations/org/symbology.validation');
const { validate } = require('../../../middleware/validate.middleware');
const { requirePermission } = require('../../../middleware/permission.middleware');
const { ORG_PERMISSIONS } = require('../../../config/constants');

const router = express.Router();

router.get('/', requirePermission(ORG_PERMISSIONS.PROJECTS_VIEW), ctrl.list);
router.post('/', requirePermission(ORG_PERMISSIONS.PROJECTS_CREATE), validate(v.create), ctrl.create);
router.get('/:id', requirePermission(ORG_PERMISSIONS.PROJECTS_VIEW), validate(v.idParam), ctrl.get);
router.patch('/:id', requirePermission(ORG_PERMISSIONS.PROJECTS_UPDATE), validate(v.update), ctrl.update);
router.delete('/:id', requirePermission(ORG_PERMISSIONS.PROJECTS_DELETE), validate(v.idParam), ctrl.remove);

// Which symbologies (point/line/polygon drawing tools) a project's surveys may use.
router.get('/:id/symbologies', requirePermission(ORG_PERMISSIONS.SYMBOLOGIES_VIEW), validate(symbologyValidation.idParam), symbologyCtrl.listForProject);
router.put('/:id/symbologies', requirePermission(ORG_PERMISSIONS.SYMBOLOGIES_MANAGE), validate(symbologyValidation.setForProject), symbologyCtrl.setForProject);

module.exports = router;
