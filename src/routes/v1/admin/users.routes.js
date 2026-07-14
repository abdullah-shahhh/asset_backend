'use strict';

const express = require('express');
const ctrl = require('../../../controllers/admin/user.controller');
const v = require('../../../validations/admin/user.validation');
const { validate } = require('../../../middleware/validate.middleware');
const { requirePermission } = require('../../../middleware/permission.middleware');
const { PERMISSIONS } = require('../../../config/constants');

const router = express.Router();

router.get('/', requirePermission(PERMISSIONS.USERS_VIEW), ctrl.list);
router.post('/', requirePermission(PERMISSIONS.USERS_CREATE), validate(v.create), ctrl.create);
router.get('/:id', requirePermission(PERMISSIONS.USERS_VIEW), validate(v.idParam), ctrl.get);
router.patch('/:id', requirePermission(PERMISSIONS.USERS_UPDATE), validate(v.update), ctrl.update);
router.patch('/:id/status', requirePermission(PERMISSIONS.USERS_UPDATE), validate(v.setStatus), ctrl.setStatus);
router.delete('/:id', requirePermission(PERMISSIONS.USERS_DELETE), validate(v.idParam), ctrl.remove);

module.exports = router;
