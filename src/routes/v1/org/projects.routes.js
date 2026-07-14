'use strict';

const express = require('express');
const ctrl = require('../../../controllers/org/project.controller');
const v = require('../../../validations/org/project.validation');
const { validate } = require('../../../middleware/validate.middleware');
const { requirePermission } = require('../../../middleware/permission.middleware');
const { ORG_PERMISSIONS } = require('../../../config/constants');

const router = express.Router();

router.get('/', requirePermission(ORG_PERMISSIONS.PROJECTS_VIEW), ctrl.list);
router.post('/', requirePermission(ORG_PERMISSIONS.PROJECTS_CREATE), validate(v.create), ctrl.create);
router.get('/:id', requirePermission(ORG_PERMISSIONS.PROJECTS_VIEW), validate(v.idParam), ctrl.get);
router.patch('/:id', requirePermission(ORG_PERMISSIONS.PROJECTS_UPDATE), validate(v.update), ctrl.update);
router.delete('/:id', requirePermission(ORG_PERMISSIONS.PROJECTS_DELETE), validate(v.idParam), ctrl.remove);

module.exports = router;
