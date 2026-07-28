'use strict';

const express = require('express');
const adminRoutes = require('./admin');
const orgRoutes = require('./org');
const publicShareRoutes = require('./public/share.routes');

const router = express.Router();

/**
 * v1 API.
 *  - /admin/*      : platform (superadmin).
 *  - /org/*        : organization staff portal (client panel today, future
 *                    mobile field surveyors tomorrow — same realm, see
 *                    backend README).
 *  - /public/share/* : anonymous, token-scoped read-only map views (see
 *                    shareToken.middleware.js) — no auth at all by design.
 */
router.use('/admin', adminRoutes);
router.use('/org', orgRoutes);
router.use('/public/share', publicShareRoutes);

module.exports = router;
