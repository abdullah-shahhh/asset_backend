'use strict';

const express = require('express');
const ctrl = require('../../../controllers/admin/surveyTemplate.controller');
const v = require('../../../validations/admin/surveyTemplate.validation');
const { validate } = require('../../../middleware/validate.middleware');
const { requirePermission } = require('../../../middleware/permission.middleware');
const { PERMISSIONS } = require('../../../config/constants');

const router = express.Router();

router.get('/', requirePermission(PERMISSIONS.MODULES_VIEW), validate(v.listQuery), ctrl.list);
router.post('/', requirePermission(PERMISSIONS.MODULES_MANAGE), validate(v.create), ctrl.create);
router.get('/:id', requirePermission(PERMISSIONS.MODULES_VIEW), validate(v.idParam), ctrl.get);
router.patch('/:id', requirePermission(PERMISSIONS.MODULES_MANAGE), validate(v.update), ctrl.update);

module.exports = router;
