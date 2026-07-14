'use strict';

/**
 * Run TENANT migrations against every (or one) organization database.
 *
 * Usage:
 *   node scripts/migrate-tenants.js            # migrate all provisioned organizations
 *   node scripts/migrate-tenants.js <slug>     # migrate one organization by slug
 *   node scripts/migrate-tenants.js --undo     # rollback last migration on all
 *
 * Each organization's per-DB migration state is tracked in a
 * `tenant_migrations` table inside that organization's own database (via
 * Umzug's SequelizeStorage).
 */

const { Sequelize } = require('sequelize');

const config = require('../src/config');
const logger = require('../src/config/logger');
const { mainDb } = require('../src/database');
const { migrateUp, migrateDown } = require('../src/database/tenantMigrator');

async function migrateOrganization(organization, { undo }) {
  const dbName = organization.dbName || `${config.db.tenant.prefix}${organization.slug}`;
  const sequelize = new Sequelize(dbName, config.db.tenant.username, config.db.tenant.password, {
    host: config.db.tenant.host,
    port: config.db.tenant.port,
    dialect: config.db.tenant.dialect,
    logging: false,
  });

  try {
    await sequelize.authenticate();
    if (undo) {
      const reverted = await migrateDown(sequelize);
      logger.info(`↩️  [${dbName}] reverted: ${reverted.map((m) => m.name).join(', ') || 'none'}`);
    } else {
      const applied = await migrateUp(sequelize);
      logger.info(`✅ [${dbName}] applied: ${applied.map((m) => m.name).join(', ') || 'up to date'}`);
    }
  } catch (err) {
    logger.error(`❌ [${dbName}] migration failed: ${err.message}`);
    throw err;
  } finally {
    await sequelize.close();
  }
}

(async () => {
  const args = process.argv.slice(2);
  const undo = args.includes('--undo');
  const slug = args.find((a) => !a.startsWith('--'));

  try {
    await mainDb.sequelize.authenticate();

    const where = { isProvisioned: true };
    if (slug) where.slug = slug;

    const organizations = await mainDb.Organization.findAll({ where });
    if (!organizations.length) {
      logger.warn('No matching organizations found. Nothing to migrate.');
      process.exit(0);
    }

    logger.info(`Running tenant migrations for ${organizations.length} organization(s)...`);
    for (const organization of organizations) {
      // eslint-disable-next-line no-await-in-loop
      await migrateOrganization(organization, { undo });
    }

    logger.info('🎉 Tenant migrations complete.');
    process.exit(0);
  } catch (err) {
    logger.error(`Tenant migration run failed: ${err.stack || err.message}`);
    process.exit(1);
  }
})();
