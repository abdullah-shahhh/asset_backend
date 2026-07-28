'use strict';

const express = require('express');
const ctrl = require('../../../controllers/org/shareLink.controller');
const v = require('../../../validations/org/shareLink.validation');
const { validate } = require('../../../middleware/validate.middleware');
const { requirePermission } = require('../../../middleware/permission.middleware');
const { ORG_PERMISSIONS } = require('../../../config/constants');

const router = express.Router();

router.get('/', requirePermission(ORG_PERMISSIONS.SHARE_LINKS_MANAGE), validate(v.list), ctrl.list);
router.post('/', requirePermission(ORG_PERMISSIONS.SHARE_LINKS_MANAGE), validate(v.create), ctrl.create);
router.delete('/:id', requirePermission(ORG_PERMISSIONS.SHARE_LINKS_MANAGE), validate(v.idParam), ctrl.revoke);

module.exports = router;
