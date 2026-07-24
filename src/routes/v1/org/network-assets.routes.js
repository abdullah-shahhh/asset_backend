'use strict';

const express = require('express');
const ctrl = require('../../../controllers/org/networkAsset.controller');
const v = require('../../../validations/org/networkAsset.validation');
const strandV = require('../../../validations/org/fiberStrand.validation');
const portV = require('../../../validations/org/equipmentPort.validation');
const { validate } = require('../../../middleware/validate.middleware');
const { requirePermission } = require('../../../middleware/permission.middleware');
const { ORG_PERMISSIONS } = require('../../../config/constants');

const router = express.Router();

router.get('/', requirePermission(ORG_PERMISSIONS.ASSETS_VIEW), validate(v.listQuery), ctrl.list);
// This is the endpoint the future mobile app posts survey data into.
router.post('/', requirePermission(ORG_PERMISSIONS.ASSETS_CREATE), validate(v.create), ctrl.create);
router.post('/import', requirePermission(ORG_PERMISSIONS.ASSETS_CREATE), validate(v.importGeoJSON), ctrl.importGeoJSON);
// Registered before /:id so Express doesn't treat "alarms" as an id param.
router.get('/alarms', requirePermission(ORG_PERMISSIONS.ASSETS_VIEW), ctrl.alarms);
router.get('/:id', requirePermission(ORG_PERMISSIONS.ASSETS_VIEW), validate(v.idParam), ctrl.get);
router.patch('/:id', requirePermission(ORG_PERMISSIONS.ASSETS_UPDATE), validate(v.update), ctrl.update);
router.delete('/:id', requirePermission(ORG_PERMISSIONS.ASSETS_DELETE), validate(v.idParam), ctrl.remove);
router.post('/:id/approve', requirePermission(ORG_PERMISSIONS.ASSETS_APPROVE), validate(v.idParam), ctrl.approve);
router.post('/:id/reject', requirePermission(ORG_PERMISSIONS.ASSETS_APPROVE), validate(v.reject), ctrl.reject);

// Fiber strand management — only meaningful when the asset's symbology is is_cable.
router.post('/:id/strands/generate', requirePermission(ORG_PERMISSIONS.ASSETS_UPDATE), validate(strandV.generate), ctrl.generateStrands);
router.get('/:id/strands', requirePermission(ORG_PERMISSIONS.ASSETS_VIEW), validate(strandV.idParam), ctrl.listStrands);
router.patch('/:id/strands/:strandId', requirePermission(ORG_PERMISSIONS.ASSETS_UPDATE), validate(strandV.update), ctrl.updateStrand);

// Equipment ports — only meaningful when the asset's symbology is is_equipment.
router.post('/:id/ports/generate', requirePermission(ORG_PERMISSIONS.ASSETS_UPDATE), validate(portV.generate), ctrl.generatePorts);
router.get('/:id/ports', requirePermission(ORG_PERMISSIONS.ASSETS_VIEW), validate(v.idParam), ctrl.listPorts);
router.patch('/:id/ports/:portId', requirePermission(ORG_PERMISSIONS.ASSETS_UPDATE), validate(portV.update), ctrl.updatePort);

module.exports = router;
