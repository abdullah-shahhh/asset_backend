'use strict';

// Consumed by sequelize-cli for the MAIN database migrations. Tenant (per-org)
// migrations are run programmatically via the Umzug runner in
// scripts/migrate-tenants.js (see package.json scripts).

const config = require('./');

const base = {
  username: config.db.main.username,
  password: config.db.main.password,
  database: config.db.main.database,
  host: config.db.main.host,
  port: config.db.main.port,
  dialect: config.db.main.dialect,
  logging: config.db.main.logging ? console.log : false, // eslint-disable-line no-console
  define: {
    underscored: true,
    timestamps: true,
  },
};

module.exports = {
  development: base,
  test: base,
  production: base,
};
