'use strict';

const express = require('express');
const { authenticatePlatform } = require('../../../middleware/auth.middleware');

const authRoutes = require('./auth.routes');
const organizationsRoutes = require('./organizations.routes');
const modulesRoutes = require('./modules.routes');
const surveyTemplatesRoutes = require('./survey-templates.routes');
const rolesRoutes = require('./roles.routes');
const usersRoutes = require('./users.routes');
const auditLogsRoutes = require('./audit-logs.routes');

const router = express.Router();

// Auth endpoints are public (login/refresh/logout); /me is guarded internally.
router.use('/auth', authRoutes);

// Everything below requires an authenticated platform (superadmin) user.
router.use(authenticatePlatform);

router.use('/organizations', organizationsRoutes);
router.use('/modules', modulesRoutes);
router.use('/survey-templates', surveyTemplatesRoutes);
router.use('/roles', rolesRoutes);
router.use('/users', usersRoutes);
router.use('/audit-logs', auditLogsRoutes);

module.exports = router;
