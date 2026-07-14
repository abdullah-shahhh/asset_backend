'use strict';

const mainDb = require('../models/main');
const connectionManager = require('./connectionManager');
const logger = require('../config/logger');

/**
 * Verify the main database connection on boot. Tenant connections are created
 * lazily per request by the connection manager, so we only authenticate main here.
 */
async function connect() {
  await mainDb.sequelize.authenticate();
  logger.info('✅ Main database connection established');
}

/** Gracefully close main + all tenant connections. */
async function disconnect() {
  await connectionManager.closeAll();
  await mainDb.sequelize.close();
  logger.info('🛑 All database connections closed');
}

module.exports = {
  mainDb,
  connectionManager,
  connect,
  disconnect,
};
