'use strict';

const http = require('http');
const app = require('./app');
const config = require('./config');
const logger = require('./config/logger');
const db = require('./database');

let server;

async function bootstrap() {
  // Verify the main DB connection before accepting traffic.
  await db.connect();

  server = http.createServer(app);

  server.listen(config.port, () => {
    logger.info(`🚀 ${config.appName} listening on port ${config.port} [${config.env}]`);
    logger.info(`   API base: ${config.apiPrefix}/v1`);
  });
}

/* ---------------------------------------------------------------------------
 * Graceful shutdown & process safety nets.
 * ------------------------------------------------------------------------- */

async function shutdown(signal) {
  logger.info(`${signal} received — shutting down gracefully...`);
  if (server) {
    server.close(async () => {
      await db.disconnect().catch((e) => logger.error(e.message));
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  } else {
    await db.disconnect().catch(() => {});
    process.exit(0);
  }
}

['SIGTERM', 'SIGINT'].forEach((sig) => process.on(sig, () => shutdown(sig)));

process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled Rejection: ${reason instanceof Error ? reason.stack : reason}`);
});
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.stack || err.message}`);
  shutdown('uncaughtException');
});

bootstrap().catch((err) => {
  logger.error(`Failed to start server: ${err.stack || err.message}`);
  process.exit(1);
});
