'use strict';

const express = require('express');
const ctrl = require('../../../controllers/public/share.controller');
const { resolveShareToken } = require('../../../middleware/shareToken.middleware');

const router = express.Router();

// Every route here is anonymous — resolveShareToken is the only gate, and it
// scopes everything downstream to exactly one project (see its doc comment).
router.use('/:token', resolveShareToken);
router.get('/:token', ctrl.getProject);
router.get('/:token/network-assets', ctrl.listAssets);
router.get('/:token/network-connections', ctrl.listConnections);
router.get('/:token/network-assets/:assetId/strands', ctrl.listStrands);
router.get('/:token/network-assets/:assetId/ports', ctrl.listPorts);

module.exports = router;
