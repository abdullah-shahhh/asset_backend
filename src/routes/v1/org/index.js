'use strict';

const express = require('express');
const { authenticateOrg } = require('../../../middleware/auth.middleware');
const { validate } = require('../../../middleware/validate.middleware');
const { authLimiter } = require('../../../middleware/rateLimiter.middleware');
const fieldTeamCtrl = require('../../../controllers/org/fieldTeam.controller');
const fieldTeamValidation = require('../../../validations/org/fieldTeam.validation');

const authRoutes = require('./auth.routes');
const rolesRoutes = require('./roles.routes');
const usersRoutes = require('./users.routes');
const projectsRoutes = require('./projects.routes');
const networkAssetsRoutes = require('./network-assets.routes');
const networkConnectionsRoutes = require('./network-connections.routes');
const surveyTemplatesRoutes = require('./survey-templates.routes');
const symbologiesRoutes = require('./symbologies.routes');
const mediaRoutes = require('./media.routes');
const exportRoutes = require('./export.routes');
const fieldTeamRoutes = require('./field-team.routes');
const brandingRoutes = require('./branding.routes');
const customersRoutes = require('./customers.routes');
const ticketsRoutes = require('./tickets.routes');

const router = express.Router();

// Auth endpoints are public (login/refresh/logout); /me is guarded internally.
router.use('/auth', authRoutes);

// Field-team self-signup (join code) is public too — the future mobile app's
// entry point, so a surveyor can register before they have any credentials.
router.post('/field-team/signup', authLimiter, validate(fieldTeamValidation.signup), fieldTeamCtrl.signup);

// Everything below requires an authenticated org (client panel / future
// mobile) user. authenticateOrg resolves the tenant DB and attaches req.db.
router.use(authenticateOrg);

router.use('/roles', rolesRoutes);
router.use('/users', usersRoutes);
router.use('/projects', projectsRoutes);
router.use('/network-assets', networkAssetsRoutes);
router.use('/network-connections', networkConnectionsRoutes);
router.use('/survey-templates', surveyTemplatesRoutes);
router.use('/symbologies', symbologiesRoutes);
router.use('/media', mediaRoutes);
router.use('/export', exportRoutes);
router.use('/field-team', fieldTeamRoutes);
router.use('/branding', brandingRoutes);
router.use('/customers', customersRoutes);
router.use('/tickets', ticketsRoutes);

module.exports = router;
