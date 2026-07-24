'use strict';

/**
 * Flags the "Tower" symbology as an RF site (adds RF planning fields:
 * frequency, TX power, antenna height) and backfills realistic values onto
 * the existing Tower asset in "Downtown Exchange OFC Network" so the RF
 * coverage feature has real numbers to compute from out of the box.
 * Additive/idempotent — safe to re-run.
 */

const config = require('../src/config');
const logger = require('../src/config/logger');
const { mainDb, connectionManager } = require('../src/database');

const RF_FIELDS = [
  { key: 'frequencyMhz', label: 'Frequency (MHz)', type: 'number', required: true },
  { key: 'txPowerDbm', label: 'TX Power (dBm)', type: 'number', required: true },
  { key: 'antennaHeightM', label: 'Antenna Height (m)', type: 'number', required: true },
];

(async () => {
  try {
    await mainDb.sequelize.authenticate();
    const { slug, adminEmail } = config.seed.demoOrg;
    const organization = await mainDb.Organization.findOne({ where: { slug } });
    if (!organization) {
      logger.error('Demo organization not found — run `npm run seed:demo-org` first.');
      process.exit(1);
    }
    const { models } = await connectionManager.getConnection(organization);

    const tower = await models.Symbology.findOne({ where: { name: 'Tower' } });
    if (!tower) {
      logger.error('Tower symbology not found — run `npm run seed:ofc-network-demo` first.');
      process.exit(1);
    }
    const mergedFields = [...tower.fields, ...RF_FIELDS.filter((f) => !tower.fields.some((existing) => existing.key === f.key))];
    if (!tower.isRfSite || mergedFields.length !== tower.fields.length) {
      await tower.update({ isRfSite: true, fields: mergedFields });
      logger.info('📡 Flagged Tower symbology as an RF site and added frequency/power/height fields.');
    } else {
      logger.info('Tower symbology already flagged as an RF site — nothing to do there.');
    }

    const towerAsset = await models.NetworkAsset.findOne({ where: { symbologyId: tower.id } });
    if (!towerAsset) {
      logger.info('No Tower asset found yet — nothing to backfill.');
    } else if (towerAsset.attributes.frequencyMhz) {
      logger.info('Tower asset already has RF attributes — leaving as-is.');
    } else {
      await towerAsset.update({
        attributes: {
          ...towerAsset.attributes,
          frequencyMhz: 1900,
          txPowerDbm: 43,
          antennaHeightM: 30,
        },
      });
      logger.info('📡 Backfilled realistic RF attributes (1900 MHz, 43 dBm, 30 m) onto the Tower asset.');
    }

    logger.info('✅ RF coverage demo data ready.');
    process.exit(0);
  } catch (err) {
    logger.error(`RF coverage demo seed failed: ${err.message}`);
    process.exit(1);
  }
})();
