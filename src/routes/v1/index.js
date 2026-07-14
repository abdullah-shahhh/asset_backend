'use strict';

const express = require('express');
const adminRoutes = require('./admin');
const orgRoutes = require('./org');

const router = express.Router();

/**
 * v1 API.
 *  - /admin/* : platform (superadmin).
 *  - /org/*   : organization staff portal (client panel today, future mobile
 *               field surveyors tomorrow — same realm, see backend README).
 */
router.use('/admin', adminRoutes);
router.use('/org', orgRoutes);

module.exports = router;
