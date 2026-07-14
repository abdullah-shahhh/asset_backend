'use strict';

const express = require('express');
const ctrl = require('../../../controllers/org/branding.controller');
const v = require('../../../validations/org/branding.validation');
const { validate } = require('../../../middleware/validate.middleware');
const { requirePermission } = require('../../../middleware/permission.middleware');
const { imageUploader } = require('../../../middleware/upload.middleware');
const { ORG_PERMISSIONS } = require('../../../config/constants');

const router = express.Router();

// Any authenticated org user can read branding (drives the whole panel's theme).
router.get('/', ctrl.get);
router.patch('/', requirePermission(ORG_PERMISSIONS.BRANDING_MANAGE), validate(v.update), ctrl.update);
router.post('/logo', requirePermission(ORG_PERMISSIONS.BRANDING_MANAGE), imageUploader.single('file'), ctrl.uploadLogo);

module.exports = router;
