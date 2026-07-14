'use strict';

const path = require('path');
const { Sequelize } = require('sequelize');
const { Umzug, SequelizeStorage } = require('umzug');

const MIGRATIONS_GLOB = path.join(__dirname, 'migrations', 'tenant', '*.js').replace(/\\/g, '/');

/** Build an Umzug instance bound to a tenant Sequelize connection. */
function buildUmzug(sequelize) {
  return new Umzug({
    migrations: {
      glob: MIGRATIONS_GLOB,
      resolve: ({ name, path: migrationPath, context }) => {
        const migration = require(migrationPath);
        return {
          name,
          up: async () => migration.up(context.queryInterface, context.Sequelize),
          down: async () => migration.down(context.queryInterface, context.Sequelize),
        };
      },
    },
    context: { queryInterface: sequelize.getQueryInterface(), Sequelize },
    storage: new SequelizeStorage({ sequelize, tableName: 'tenant_migrations' }),
    logger: undefined,
  });
}

/** Apply all pending tenant migrations on the given connection. */
async function migrateUp(sequelize) {
  return buildUmzug(sequelize).up();
}

/** Roll back the most recent tenant migration on the given connection. */
async function migrateDown(sequelize) {
  return buildUmzug(sequelize).down();
}

module.exports = { buildUmzug, migrateUp, migrateDown, MIGRATIONS_GLOB, Sequelize };
