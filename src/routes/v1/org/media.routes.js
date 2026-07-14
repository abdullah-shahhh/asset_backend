'use strict';

const express = require('express');
const ctrl = require('../../../controllers/org/media.controller');
const v = require('../../../validations/org/media.validation');
const { validate } = require('../../../middleware/validate.middleware');
const { requirePermission } = require('../../../middleware/permission.middleware');
const { imageUploader } = require('../../../middleware/upload.middleware');
const { ORG_PERMISSIONS } = require('../../../config/constants');

const router = express.Router();

router.post(
  '/',
  requirePermission(ORG_PERMISSIONS.MEDIA_UPLOAD),
  imageUploader.single('file'),
  validate(v.upload),
  ctrl.upload
);
router.get(
  '/asset/:networkAssetId',
  requirePermission(ORG_PERMISSIONS.ASSETS_VIEW),
  validate(v.listForAsset),
  ctrl.listForAsset
);

module.exports = router;
