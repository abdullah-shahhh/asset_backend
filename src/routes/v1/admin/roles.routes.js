'use strict';

const express = require('express');
const ctrl = require('../../../controllers/admin/role.controller');
const v = require('../../../validations/admin/role.validation');
const { validate } = require('../../../middleware/validate.middleware');
const { requirePermission } = require('../../../middleware/permission.middleware');
const { PERMISSIONS } = require('../../../config/constants');

const router = express.Router();

router.get('/permissions', requirePermission(PERMISSIONS.ROLES_VIEW), ctrl.listPermissions);

router.get('/', requirePermission(PERMISSIONS.ROLES_VIEW), ctrl.list);
router.post('/', requirePermission(PERMISSIONS.ROLES_CREATE), validate(v.create), ctrl.create);
router.get('/:id', requirePermission(PERMISSIONS.ROLES_VIEW), validate(v.idParam), ctrl.get);
router.patch('/:id', requirePermission(PERMISSIONS.ROLES_UPDATE), validate(v.update), ctrl.update);
router.delete('/:id', requirePermission(PERMISSIONS.ROLES_DELETE), validate(v.idParam), ctrl.remove);

module.exports = router;
