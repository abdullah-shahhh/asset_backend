'use strict';

const express = require('express');
const ctrl = require('../../../controllers/admin/auth.controller');
const v = require('../../../validations/admin/auth.validation');
const { validate } = require('../../../middleware/validate.middleware');
const { authenticatePlatform } = require('../../../middleware/auth.middleware');
const { authLimiter } = require('../../../middleware/rateLimiter.middleware');

const router = express.Router();

router.post('/login', authLimiter, validate(v.login), ctrl.login);
router.post('/refresh', validate(v.refresh), ctrl.refresh);
router.post('/logout', validate(v.logout), ctrl.logout);
router.get('/me', authenticatePlatform, ctrl.me);

module.exports = router;
