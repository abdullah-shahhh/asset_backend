'use strict';

const express = require('express');
const ctrl = require('../../../controllers/admin/module.controller');
const { requirePermission } = require('../../../middleware/permission.middleware');
const { PERMISSIONS } = require('../../../config/constants');

const router = express.Router();

router.get('/', requirePermission(PERMISSIONS.MODULES_VIEW), ctrl.list);

module.exports = router;
