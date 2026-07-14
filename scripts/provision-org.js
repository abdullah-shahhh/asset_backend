'use strict';

/**
 * Provision a new organization tenant:
 *   1. Create the organization record in the MAIN db (if it doesn't exist).
 *   2. CREATE DATABASE for the tenant (connects to the maintenance `postgres` db).
 *   3. Run all tenant migrations against the new database.
 *   4. Seed permission catalog, Org Admin + Surveyor roles, and the owner user.
 *
 * Usage:
 *   node scripts/provision-org.js --name "Acme City" --slug acme --email ops@acme.gov \
 *     --admin-email admin@acme.gov --admin-password ChangeMe123! --admin-first-name Jane
 *
 * Requires a Postgres role with CREATEDB privilege.
 */

const config = require('../src/config');
const logger = require('../src/config/logger');
const { mainDb } = require('../src/database');
const provisioningService = require('../src/services/admin/provisioning.service');
const { uniqueJoinCode } = require('../src/helpers/code.helper');
const { ORGANIZATION_STATUS } = require('../src/config/constants');

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[(i += 1)] : true;
      out[key] = val;
    }
  }
  return out;
}

(async () => {
  const args = parseArgs(process.argv.slice(2));
  if (!args.name || !args.slug || !args['admin-email'] || !args['admin-password']) {
    logger.error(
      'Usage: node scripts/provision-org.js --name "Acme" --slug acme --admin-email x@y.com --admin-password secret [--admin-first-name Jane] [--email ops@y.com]'
    );
    process.exit(1);
  }

  const slug = String(args.slug).toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const dbName = `${config.db.tenant.prefix}${slug}`;

  try {
    await mainDb.sequelize.authenticate();

    let organization = await mainDb.Organization.findOne({ where: { slug } });
    if (!organization) {
      organization = await mainDb.Organization.create({
        name: args.name,
        slug,
        dbName,
        joinCode: await uniqueJoinCode(),
        email: args.email || null,
        status: ORGANIZATION_STATUS.PENDING,
      });
      logger.info(`🏢 Organization "${organization.name}" registered (id=${organization.id}).`);
    } else {
      logger.info(`Organization "${organization.name}" already registered.`);
    }

    await provisioningService.provision(organization, {
      firstName: args['admin-first-name'] || 'Org',
      lastName: args['admin-last-name'] || 'Admin',
      email: args['admin-email'],
      password: args['admin-password'],
    });
    await organization.update({ status: ORGANIZATION_STATUS.ACTIVE });

    logger.info(`🎉 Organization "${slug}" provisioned successfully.`);
    process.exit(0);
  } catch (err) {
    logger.error(`Provisioning failed: ${err.stack || err.message}`);
    process.exit(1);
  }
})();
