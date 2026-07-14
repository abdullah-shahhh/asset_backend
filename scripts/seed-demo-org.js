'use strict';

/**
 * Provision a demo organization end-to-end so both panels are testable
 * immediately after setup:
 *   1. Create + provision the demo org (SEED_DEMO_ORG_* env) with an org-admin user.
 *   2. Enable the OFC module for it.
 *   3. Seed a demo Project + a couple of sample NetworkAssets (pole, cable segment).
 *
 * Idempotent — safe to re-run.
 */

const config = require('../src/config');
const logger = require('../src/config/logger');
const { mainDb, connectionManager } = require('../src/database');
const provisioningService = require('../src/services/admin/provisioning.service');
const { uniqueJoinCode } = require('../src/helpers/code.helper');
const { ORGANIZATION_STATUS, NETWORK_ASSET_STATUS } = require('../src/config/constants');

(async () => {
  try {
    await mainDb.sequelize.authenticate();

    const { name, slug, adminEmail, adminPassword } = config.seed.demoOrg;
    const dbName = `${config.db.tenant.prefix}${slug}`;

    let organization = await mainDb.Organization.findOne({ where: { slug } });
    if (!organization) {
      organization = await mainDb.Organization.create({
        name,
        slug,
        dbName,
        joinCode: await uniqueJoinCode(),
        email: adminEmail,
        primaryColor: '#2f4fb4',
        secondaryColor: '#1f8470',
        status: ORGANIZATION_STATUS.PENDING,
      });
      logger.info(`🏢 Demo organization "${name}" registered.`);
    }

    if (!organization.isProvisioned) {
      await provisioningService.provision(organization, {
        firstName: 'Demo',
        lastName: 'Admin',
        email: adminEmail,
        password: adminPassword,
      });
      await organization.update({ status: ORGANIZATION_STATUS.ACTIVE });
      logger.info('✅ Demo organization provisioned.');
    } else {
      logger.info('Demo organization already provisioned.');
    }

    // Enable the OFC module.
    const ofcModule = await mainDb.Module.findOne({ where: { key: 'OFC' } });
    if (!ofcModule) {
      logger.error('OFC module not found — run `npm run seed:main` first.');
      process.exit(1);
    }
    await mainDb.OrganizationModule.findOrCreate({
      where: { organizationId: organization.id, moduleId: ofcModule.id },
      defaults: { organizationId: organization.id, moduleId: ofcModule.id },
    });
    logger.info('✅ OFC module enabled for demo organization.');

    // Demo project + sample assets.
    const { models } = await connectionManager.getConnection(organization);
    const [project] = await models.Project.findOrCreate({
      where: { name: 'Downtown Fiber Rollout' },
      defaults: { name: 'Downtown Fiber Rollout', description: 'Phase 1 demo survey project.', status: 'active' },
    });

    const adminUser = await models.User.findOne({ where: { email: adminEmail } });

    const existingAssets = await models.NetworkAsset.count({ where: { projectId: project.id } });
    if (existingAssets === 0) {
      await models.NetworkAsset.bulkCreate([
        {
          projectId: project.id,
          moduleId: ofcModule.id,
          assetType: 'pole',
          geometryType: 'Point',
          geom: { type: 'Point', coordinates: [-122.4194, 37.7749] },
          attributes: { material: 'Wood', heightMeters: 9 },
          status: NETWORK_ASSET_STATUS.APPROVED,
          createdByUserId: adminUser?.id || null,
          reviewedByUserId: adminUser?.id || null,
          reviewedAt: new Date(),
        },
        {
          projectId: project.id,
          moduleId: ofcModule.id,
          assetType: 'cable_segment',
          geometryType: 'LineString',
          geom: {
            type: 'LineString',
            coordinates: [
              [-122.4194, 37.7749],
              [-122.418, 37.7755],
            ],
          },
          attributes: { cableType: 'Aerial', coreCount: 24 },
          status: NETWORK_ASSET_STATUS.PENDING,
          createdByUserId: adminUser?.id || null,
        },
      ]);
      logger.info('✅ Seeded 2 sample network assets.');
    } else {
      logger.info('Demo project already has sample assets.');
    }

    logger.info(`🎉 Demo org ready. Log in at the client panel with ${adminEmail} / (your SEED_DEMO_ADMIN_PASSWORD).`);
    process.exit(0);
  } catch (err) {
    logger.error(`Demo seed failed: ${err.stack || err.message}`);
    process.exit(1);
  }
})();
