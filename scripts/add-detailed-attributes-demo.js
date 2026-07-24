'use strict';

/**
 * Adds richer per-type attribute schemas to Utility Pole, Cabinet, Handhole,
 * ODF, ONT, and Splice Closure symbologies, and backfills realistic sample
 * values onto the existing assets of each type in "Downtown Exchange OFC
 * Network" so the demo shows populated data, not blank fields.
 * Additive/idempotent — safe to re-run; skips fields/values already present.
 */

const config = require('../src/config');
const logger = require('../src/config/logger');
const { mainDb, connectionManager } = require('../src/database');

const PROJECT_NAME = 'Downtown Exchange OFC Network';

const NEW_FIELDS_BY_SYMBOLOGY = {
  'Utility Pole': [
    { key: 'poleId', label: 'Pole ID', type: 'text', required: true },
    { key: 'heightFt', label: 'Height (ft)', type: 'number' },
    { key: 'material', label: 'Material', type: 'select', options: ['Wood', 'Concrete', 'Steel', 'Composite'] },
    { key: 'gpsCoordinates', label: 'GPS Coordinates (As-Built)', type: 'text' },
  ],
  Cabinet: [
    { key: 'cabinetId', label: 'Cabinet ID', type: 'text', required: true },
    { key: 'capacity', label: 'Capacity', type: 'number' },
    { key: 'usedPorts', label: 'Used Ports', type: 'number' },
    { key: 'temperatureC', label: 'Temperature (°C)', type: 'number' },
    { key: 'status', label: 'Status', type: 'select', options: ['Operational', 'Faulty', 'Under Maintenance', 'Decommissioned'] },
  ],
  Handhole: [
    { key: 'depthIn', label: 'Depth (in)', type: 'number' },
    { key: 'size', label: 'Size', type: 'text' },
    { key: 'material', label: 'Material', type: 'select', options: ['Concrete', 'Polymer', 'Fiberglass'] },
    { key: 'gpsCoordinates', label: 'GPS Coordinates (As-Built)', type: 'text' },
  ],
  ODF: [
    { key: 'depthIn', label: 'Depth (in)', type: 'number' },
    { key: 'size', label: 'Size', type: 'text' },
    { key: 'material', label: 'Material', type: 'select', options: ['Metal', 'Composite', 'Plastic'] },
    { key: 'gpsCoordinates', label: 'GPS Coordinates (As-Built)', type: 'text' },
  ],
  'ONT (Customer Terminal)': [
    { key: 'customerIdRef', label: 'Customer ID', type: 'text' },
    { key: 'serialNumber', label: 'Serial Number', type: 'text', required: true },
    { key: 'onlineStatus', label: 'Online Status', type: 'select', options: ['Online', 'Offline'] },
  ],
  'Splice Closure': [
    { key: 'closureId', label: 'Closure ID', type: 'text', required: true },
    { key: 'numberOfSplices', label: 'Number of Splices', type: 'number' },
    { key: 'capacity', label: 'Capacity', type: 'number' },
  ],
};

// Deterministic-ish sample values per asset index (1-based) for each type —
// varied so the demo doesn't look like every row was copy-pasted.
const SAMPLE_VALUES = {
  'Utility Pole': (i) => ({
    poleId: `POLE-${String(i).padStart(3, '0')}`,
    heightFt: [30, 35, 32, 40, 35, 38][i - 1] ?? 35,
    material: ['Wood', 'Concrete', 'Wood', 'Steel', 'Wood', 'Composite'][i - 1] ?? 'Wood',
    gpsCoordinates: null, // left blank — filled from the real geometry, not invented
  }),
  Cabinet: (i) => ({
    cabinetId: `CAB-${String(i).padStart(3, '0')}`,
    capacity: 288,
    usedPorts: 12,
    temperatureC: 24,
    status: 'Operational',
  }),
  Handhole: (i) => ({
    depthIn: [24, 30, 24][i - 1] ?? 24,
    size: ['24x36 in', '30x48 in', '24x36 in'][i - 1] ?? '24x36 in',
    material: ['Concrete', 'Polymer', 'Concrete'][i - 1] ?? 'Concrete',
    gpsCoordinates: null,
  }),
  ODF: () => ({
    depthIn: 12,
    size: '19 in rack, 1U',
    material: 'Metal',
    gpsCoordinates: null,
  }),
  'ONT (Customer Terminal)': (i) => ({
    customerIdRef: null, // real link already exists via the linked Customer record
    serialNumber: `ONT-SN-${1000 + i}`,
    onlineStatus: 'Online',
  }),
  'Splice Closure': (i) => ({
    closureId: `SPLC-${String(i).padStart(3, '0')}`,
    numberOfSplices: 12,
    capacity: 24,
  }),
};

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

    // --- Schema: merge new fields into each symbology, skipping keys that already exist.
    for (const [name, newFields] of Object.entries(NEW_FIELDS_BY_SYMBOLOGY)) {
      // eslint-disable-next-line no-await-in-loop
      const symbology = await models.Symbology.findOne({ where: { name } });
      if (!symbology) {
        logger.warn(`Symbology "${name}" not found — skipping.`);
        continue;
      }
      const before = symbology.fields.length;
      const merged = [...symbology.fields, ...newFields.filter((f) => !symbology.fields.some((existing) => existing.key === f.key))];
      if (merged.length !== before) {
        // eslint-disable-next-line no-await-in-loop
        await symbology.update({ fields: merged });
        logger.info(`📋 Added ${merged.length - before} field(s) to "${name}".`);
      } else {
        logger.info(`"${name}" already has all requested fields — nothing to add.`);
      }
    }

    // --- Sample values: backfill onto existing assets in the demo project.
    const project = await models.Project.findOne({ where: { name: PROJECT_NAME } });
    if (!project) {
      logger.info(`"${PROJECT_NAME}" not found — skipping value backfill.`);
      process.exit(0);
    }

    for (const name of Object.keys(NEW_FIELDS_BY_SYMBOLOGY)) {
      const symbology = await models.Symbology.findOne({ where: { name } }); // eslint-disable-line no-await-in-loop
      if (!symbology) continue;
      const assets = await models.NetworkAsset.findAll({ where: { projectId: project.id, symbologyId: symbology.id }, order: [['createdAt', 'ASC']] }); // eslint-disable-line no-await-in-loop
      const sampleFn = SAMPLE_VALUES[name];
      let updated = 0;
      for (let i = 0; i < assets.length; i++) {
        const asset = assets[i];
        const sample = sampleFn(i + 1);
        const missing = Object.entries(sample).some(([k, v]) => v !== null && asset.attributes[k] === undefined);
        if (!missing) continue;
        const patch = Object.fromEntries(Object.entries(sample).filter(([, v]) => v !== null));
        // eslint-disable-next-line no-await-in-loop
        await asset.update({ attributes: { ...asset.attributes, ...patch } });
        updated += 1;
      }
      if (updated) logger.info(`📋 Backfilled sample attribute values onto ${updated} "${name}" asset(s).`);
    }

    logger.info('✅ Detailed attribute demo data ready.');
    process.exit(0);
  } catch (err) {
    logger.error(`Detailed attributes demo seed failed: ${err.message}`);
    process.exit(1);
  }
})();
