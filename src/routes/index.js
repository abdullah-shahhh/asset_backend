'use strict';

const express = require('express');
const v1Routes = require('./v1');
const { mainDb } = require('../database');

const router = express.Router();

// Health check (no auth) — useful for load balancers & uptime monitors.
router.get('/health', async (req, res) => {
  let db = 'unknown';
  try {
    await mainDb.sequelize.authenticate();
    db = 'up';
  } catch (e) {
    db = 'down';
  }
  res.json({
    success: true,
    message: 'OK',
    data: { status: 'healthy', db, uptime: process.uptime(), timestamp: new Date().toISOString() },
  });
});

router.use('/v1', v1Routes);

module.exports = router;
