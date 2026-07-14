'use strict';

const express = require('express');
const ctrl = require('../../../controllers/org/role.controller');
const v = require('../../../validations/org/role.validation');
const { validate } = require('../../../middleware/validate.middleware');
const { requirePermission } = require('../../../middleware/permission.middleware');
const { ORG_PERMISSIONS } = require('../../../config/constants');

const router = express.Router();

router.get('/permissions', requirePermission(ORG_PERMISSIONS.ROLES_VIEW), ctrl.listPermissions);

router.get('/', requirePermission(ORG_PERMISSIONS.ROLES_VIEW), ctrl.list);
router.post('/', requirePermission(ORG_PERMISSIONS.ROLES_CREATE), validate(v.create), ctrl.create);
router.get('/:id', requirePermission(ORG_PERMISSIONS.ROLES_VIEW), validate(v.idParam), ctrl.get);
router.patch('/:id', requirePermission(ORG_PERMISSIONS.ROLES_UPDATE), validate(v.update), ctrl.update);
router.delete('/:id', requirePermission(ORG_PERMISSIONS.ROLES_DELETE), validate(v.idParam), ctrl.remove);

module.exports = router;
