'use strict';

const express = require('express');
const ctrl = require('../../../controllers/org/customers.controller');
const v = require('../../../validations/org/customers.validation');
const { validate } = require('../../../middleware/validate.middleware');
const { requirePermission } = require('../../../middleware/permission.middleware');
const { ORG_PERMISSIONS } = require('../../../config/constants');

const router = express.Router();

router.get('/', requirePermission(ORG_PERMISSIONS.CUSTOMERS_VIEW), validate(v.listQuery), ctrl.list);
router.post('/', requirePermission(ORG_PERMISSIONS.CUSTOMERS_MANAGE), validate(v.create), ctrl.create);
router.get('/:id', requirePermission(ORG_PERMISSIONS.CUSTOMERS_VIEW), validate(v.idParam), ctrl.get);
router.patch('/:id', requirePermission(ORG_PERMISSIONS.CUSTOMERS_MANAGE), validate(v.update), ctrl.update);
router.delete('/:id', requirePermission(ORG_PERMISSIONS.CUSTOMERS_MANAGE), validate(v.idParam), ctrl.remove);

module.exports = router;
