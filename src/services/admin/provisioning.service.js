'use strict';

const { Sequelize } = require('sequelize');
const config = require('../../config');
const logger = require('../../config/logger');
const { connectionManager } = require('../../database');
const { migrateUp } = require('../../database/tenantMigrator');
const orgDirectory = require('../shared/org-directory.service');
const { ORG_PERMISSION_CATALOG, SURVEYOR_PERMISSION_KEYS } = require('../../config/constants');

/**
 * Create the physical tenant database (idempotent). Connects to the `postgres`
 * maintenance database to issue CREATE DATABASE. Requires a CREATEDB role.
 */
async function createDatabase(dbName) {
  const admin = new Sequelize('postgres', config.db.tenant.username, config.db.tenant.password, {
    host: config.db.tenant.host,
    port: config.db.tenant.port,
    dialect: config.db.tenant.dialect,
    logging: false,
  });
  try {
    const [rows] = await admin.query('SELECT 1 FROM pg_database WHERE datname = :dbName', {
      replacements: { dbName },
    });
    if (rows.length) {
      logger.info(`Tenant database "${dbName}" already exists.`);
    } else {
      await admin.query(`CREATE DATABASE "${dbName}"`);
      logger.info(`🆕 Created tenant database "${dbName}".`);
    }
  } finally {
    await admin.close();
  }
}

/**
 * Seed a freshly-migrated tenant DB with its permission catalog, an Org Admin
 * role (all permissions, bypasses checks), a Surveyor role (narrow subset,
 * reserved for the future mobile app), and the owner user. Returns the
 * created owner user.
 */
async function seedTenant(organization, owner) {
  const { models, sequelize } = await connectionManager.getConnection(organization);
  const { Permission, Role, User } = models;

  return sequelize.transaction(async (transaction) => {
    // 1. Permission catalog.
    await Permission.bulkCreate(
      ORG_PERMISSION_CATALOG.map((p) => ({ key: p.key, group: p.group, label: p.label })),
      { ignoreDuplicates: true, transaction }
    );
    const permissions = await Permission.findAll({ transaction });

    // 2. Org Admin role — bypasses per-permission checks.
    const adminRole = await Role.create(
      {
        name: 'Org Admin',
        slug: 'org-admin',
        description: 'Full access to all organization operations.',
        isSystem: true,
        isSuperAdmin: true,
      },
      { transaction }
    );
    await adminRole.setPermissions(permissions, { transaction });

    // 3. Surveyor role — reserved for the future mobile app.
    const surveyorPermissions = permissions.filter((p) => SURVEYOR_PERMISSION_KEYS.includes(p.key));
    const surveyorRole = await Role.create(
      {
        name: 'Surveyor',
        slug: 'surveyor',
        description: 'Field survey capture — create assets, read templates/projects, upload media.',
        isSystem: true,
        isSuperAdmin: false,
      },
      { transaction }
    );
    await surveyorRole.setPermissions(surveyorPermissions, { transaction });

    // 4. Owner user.
    const user = await User.create(
      {
        roleId: adminRole.id,
        firstName: owner.firstName,
        lastName: owner.lastName || null,
        email: orgDirectory.normalize(owner.email),
        password: owner.password,
        phone: owner.phone || null,
        status: 'active',
      },
      { transaction }
    );

    return { user, adminRole, surveyorRole };
  });
}

/**
 * Full provisioning pipeline for an organization: create DB -> migrate -> seed.
 * Marks the organization as provisioned.
 *
 * @param {object} organization Organization instance (must have dbName)
 * @param {object} owner        { firstName, lastName, email, password, phone }
 */
async function provision(organization, owner) {
  logger.info(`⚙️  Provisioning tenant for "${organization.slug}" (${organization.dbName})...`);

  await createDatabase(organization.dbName);

  const { sequelize } = await connectionManager.getConnection(organization);
  await sequelize.authenticate();
  await migrateUp(sequelize);

  const seeded = await seedTenant(organization, owner);

  // Register the owner in the global login directory so they can sign into
  // the client panel with email + password alone (no org slug).
  await orgDirectory.register(owner.email, organization.id);

  await organization.update({ isProvisioned: true });

  logger.info(`✅ Tenant provisioned for "${organization.slug}".`);
  return seeded;
}

module.exports = { createDatabase, seedTenant, provision };
