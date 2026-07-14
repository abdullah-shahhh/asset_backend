'use strict';

const express = require('express');
const ctrl = require('../../../controllers/org/surveyTemplate.controller');
const { requirePermission } = require('../../../middleware/permission.middleware');
const { ORG_PERMISSIONS } = require('../../../config/constants');

const router = express.Router();

// Read live from the module registry — mobile + web both read this to
// render the dynamic survey form (doc §7.1 onboarding: "app pulls down...
// active module template(s)").
router.get('/', requirePermission(ORG_PERMISSIONS.TEMPLATES_VIEW), ctrl.list);

module.exports = router;
