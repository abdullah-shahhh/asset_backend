'use strict';

const express = require('express');
const ctrl = require('../../../controllers/org/fieldTeam.controller');
const v = require('../../../validations/org/fieldTeam.validation');
const { validate } = require('../../../middleware/validate.middleware');
const { requirePermission } = require('../../../middleware/permission.middleware');
const { ORG_PERMISSIONS } = require('../../../config/constants');

const router = express.Router();

// Note: POST /signup (public, join-code self-registration) is mounted
// separately in routes/v1/org/index.js, ahead of the authenticateOrg gate.

router.get('/join-code', requirePermission(ORG_PERMISSIONS.FIELD_TEAM_VIEW), ctrl.getJoinCode);
router.post('/join-code/regenerate', requirePermission(ORG_PERMISSIONS.FIELD_TEAM_MANAGE), ctrl.regenerateJoinCode);

router.get('/', requirePermission(ORG_PERMISSIONS.FIELD_TEAM_VIEW), ctrl.list);
router.post('/', requirePermission(ORG_PERMISSIONS.FIELD_TEAM_MANAGE), validate(v.create), ctrl.create);
router.post('/:id/approve', requirePermission(ORG_PERMISSIONS.FIELD_TEAM_MANAGE), validate(v.idParam), ctrl.approve);
router.post('/:id/reject', requirePermission(ORG_PERMISSIONS.FIELD_TEAM_MANAGE), validate(v.idParam), ctrl.reject);
router.patch('/:id/status', requirePermission(ORG_PERMISSIONS.FIELD_TEAM_MANAGE), validate(v.setStatus), ctrl.setStatus);
router.delete('/:id', requirePermission(ORG_PERMISSIONS.FIELD_TEAM_MANAGE), validate(v.idParam), ctrl.remove);

module.exports = router;
