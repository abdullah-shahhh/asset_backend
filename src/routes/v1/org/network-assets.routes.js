'use strict';

const express = require('express');
const ctrl = require('../../../controllers/org/networkAsset.controller');
const v = require('../../../validations/org/networkAsset.validation');
const { validate } = require('../../../middleware/validate.middleware');
const { requirePermission } = require('../../../middleware/permission.middleware');
const { ORG_PERMISSIONS } = require('../../../config/constants');

const router = express.Router();

router.get('/', requirePermission(ORG_PERMISSIONS.ASSETS_VIEW), validate(v.listQuery), ctrl.list);
// This is the endpoint the future mobile app posts survey data into.
router.post('/', requirePermission(ORG_PERMISSIONS.ASSETS_CREATE), validate(v.create), ctrl.create);
router.post('/import', requirePermission(ORG_PERMISSIONS.ASSETS_CREATE), validate(v.importGeoJSON), ctrl.importGeoJSON);
router.get('/:id', requirePermission(ORG_PERMISSIONS.ASSETS_VIEW), validate(v.idParam), ctrl.get);
router.patch('/:id', requirePermission(ORG_PERMISSIONS.ASSETS_UPDATE), validate(v.update), ctrl.update);
router.post('/:id/approve', requirePermission(ORG_PERMISSIONS.ASSETS_APPROVE), validate(v.idParam), ctrl.approve);
router.post('/:id/reject', requirePermission(ORG_PERMISSIONS.ASSETS_APPROVE), validate(v.reject), ctrl.reject);

module.exports = router;
