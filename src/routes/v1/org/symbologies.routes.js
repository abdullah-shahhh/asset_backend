'use strict';

const express = require('express');
const ctrl = require('../../../controllers/org/symbology.controller');
const v = require('../../../validations/org/symbology.validation');
const { validate } = require('../../../middleware/validate.middleware');
const { requirePermission } = require('../../../middleware/permission.middleware');
const { ORG_PERMISSIONS } = require('../../../config/constants');

const router = express.Router();

router.get('/', requirePermission(ORG_PERMISSIONS.SYMBOLOGIES_VIEW), ctrl.list);
router.post('/', requirePermission(ORG_PERMISSIONS.SYMBOLOGIES_MANAGE), validate(v.create), ctrl.create);
router.get('/:id', requirePermission(ORG_PERMISSIONS.SYMBOLOGIES_VIEW), validate(v.idParam), ctrl.get);
router.patch('/:id', requirePermission(ORG_PERMISSIONS.SYMBOLOGIES_MANAGE), validate(v.update), ctrl.update);
router.delete('/:id', requirePermission(ORG_PERMISSIONS.SYMBOLOGIES_MANAGE), validate(v.idParam), ctrl.remove);

module.exports = router;
