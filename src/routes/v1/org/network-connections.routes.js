'use strict';

const express = require('express');
const ctrl = require('../../../controllers/org/networkConnection.controller');
const v = require('../../../validations/org/networkConnection.validation');
const { validate } = require('../../../middleware/validate.middleware');
const { requirePermission } = require('../../../middleware/permission.middleware');
const { ORG_PERMISSIONS } = require('../../../config/constants');

const router = express.Router();

router.get('/', requirePermission(ORG_PERMISSIONS.ASSETS_VIEW), validate(v.listQuery), ctrl.list);
router.post('/', requirePermission(ORG_PERMISSIONS.ASSETS_UPDATE), validate(v.create), ctrl.create);
router.delete('/:id', requirePermission(ORG_PERMISSIONS.ASSETS_UPDATE), validate(v.idParam), ctrl.remove);

module.exports = router;
