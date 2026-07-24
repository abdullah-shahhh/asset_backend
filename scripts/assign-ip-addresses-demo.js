'use strict';

/**
 * Backfills a management IP address onto every equipment asset (symbology
 * isEquipment=true) in "Downtown Exchange OFC Network" that doesn't have one
 * yet, from a private 10.20.30.0/24 range, so the IP Address field and the
 * toolbar's Search IP box have real data to show/search in the demo.
 * Additive/idempotent — never overwrites an IP a manager already set.
 */

const config = require('../src/config');
const logger = require('../src/config/logger');
const { mainDb, connectionManager } = require('../src/database');

const PROJECT_NAME = 'Downtown Exchange OFC Network';

(async () => {
  try {
    await mainDb.sequelize.authenticate();
    const { slug } = config.seed.demoOrg;
    const organization = await mainDb.Organization.findOne({ where: { slug } });
    if (!organization) {
      logger.error('Demo organization not found — run `npm run seed:demo-org` first.');
      process.exit(1);
    }
    const { models } = await connectionManager.getConnection(organization);

    const project = await models.Project.findOne({ where: { name: PROJECT_NAME } });
    if (!project) {
      logger.error(`"${PROJECT_NAME}" not found — run \`npm run seed:ofc-network-demo\` first.`);
      process.exit(1);
    }

    const assets = await models.NetworkAsset.findAll({
      where: { projectId: project.id },
      include: [{ model: models.Symbology, as: 'symbology', attributes: ['id', 'name', 'isEquipment'], where: { isEquipment: true }, required: true }],
      order: [
        [{ model: models.Symbology, as: 'symbology' }, 'name', 'ASC'],
        ['createdAt', 'ASC'],
      ],
    });

    let host = 1;
    let assigned = 0;
    for (const asset of assets) {
      if (asset.ipAddress) continue; // never clobber a manager-set IP
      host += 1;
      // eslint-disable-next-line no-await-in-loop
      await asset.update({ ipAddress: `10.20.30.${host}` });
      assigned += 1;
    }

    logger.info(assigned ? `📡 Assigned management IPs to ${assigned} equipment asset(s).` : 'All equipment assets already have an IP address — nothing to do.');
    process.exit(0);
  } catch (err) {
    logger.error(`IP address demo seed failed: ${err.message}`);
    process.exit(1);
  }
})();
