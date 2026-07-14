'use strict';

const express = require('express');
const ctrl = require('../../../controllers/org/auth.controller');
const v = require('../../../validations/org/auth.validation');
const { validate } = require('../../../middleware/validate.middleware');
const { authenticateOrg } = require('../../../middleware/auth.middleware');
const { authLimiter } = require('../../../middleware/rateLimiter.middleware');

const router = express.Router();

router.post('/login', authLimiter, validate(v.login), ctrl.login);
router.post('/refresh', validate(v.refresh), ctrl.refresh);
router.post('/logout', validate(v.logout), ctrl.logout);
router.get('/me', authenticateOrg, ctrl.me);

module.exports = router;
