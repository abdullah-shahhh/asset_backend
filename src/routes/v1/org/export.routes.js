'use strict';

const express = require('express');
const ctrl = require('../../../controllers/org/export.controller');
const { validate, Joi } = require('../../../middleware/validate.middleware');
const { requirePermission } = require('../../../middleware/permission.middleware');
const { ORG_PERMISSIONS } = require('../../../config/constants');

const router = express.Router();

router.get(
  '/projects/:projectId/geojson',
  requirePermission(ORG_PERMISSIONS.EXPORT_VIEW),
  validate({ params: Joi.object({ projectId: Joi.string().uuid().required() }) }),
  ctrl.projectGeoJSON
);

module.exports = router;
