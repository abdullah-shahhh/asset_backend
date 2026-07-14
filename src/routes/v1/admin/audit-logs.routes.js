'use strict';

const express = require('express');
const ctrl = require('../../../controllers/admin/auditLog.controller');
const { requirePermission } = require('../../../middleware/permission.middleware');
const { PERMISSIONS } = require('../../../config/constants');

const router = express.Router();

router.get('/', requirePermission(PERMISSIONS.AUDIT_VIEW), ctrl.list);

module.exports = router;
