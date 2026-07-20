'use strict';

/**
 * Replace the placeholder demo data with a realistic OFC (fiber) buildout:
 * renames the demo org, rebuilds its symbology catalog, and seeds two
 * projects with a proper backbone + last-mile network including a mix of
 * approved / pending / rejected assets (a real review "journey").
 *
 * Destructive for the demo org only: wipes its existing projects,
 * symbologies, and network assets before reseeding. Login is untouched —
 * still admin@demo-city.local / SEED_DEMO_ADMIN_PASSWORD.
 *
 * Idempotent — safe to re-run.
 */

const config = require('../src/config');
const logger = require('../src/config/logger');
const { mainDb, connectionManager } = require('../src/database');
const { NETWORK_ASSET_STATUS } = require('../src/config/constants');
const fieldTeamService = require('../src/services/org/fieldTeam.service');
const orgDirectory = require('../src/services/shared/org-directory.service');

const COMPANY_NAME = 'Meridian Fiber Networks';
const FIELD_CREW_PASSWORD = 'ChangeMe123!';
const FIELD_CREW = [
  { firstName: 'Marcus', lastName: 'Webb', email: 'marcus.webb@meridianfiber-demo.local' },
  { firstName: 'Diego', lastName: 'Ramirez', email: 'diego.ramirez@meridianfiber-demo.local' },
];

function slugify(str) {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// Colors follow the APWA/Call-811 utility locate convention where it
// applies (orange = communications/fiber, for every cable symbology) and
// otherwise a spread-out qualitative palette so every point type reads as a
// visually distinct symbol against the dark basemap, not just "orange dot".
const SYMBOLOGY_DEFS = [
  { name: 'Splice Closure', geometryType: 'Point', color: '#06b6d4', icon: 'Cable' }, // cyan
  { name: 'Handhole', geometryType: 'Point', color: '#64748b', icon: 'Wrench' }, // neutral slate
  { name: 'Manhole', geometryType: 'Point', color: '#a855f7', icon: 'Construction' }, // violet
  { name: 'Utility Pole', geometryType: 'Point', color: '#92400e', icon: 'Antenna' }, // wood brown
  { name: 'Fiber Distribution Hub', geometryType: 'Point', color: '#3b82f6', icon: 'Building2' }, // blue
  { name: 'ONT (Customer Terminal)', geometryType: 'Point', color: '#22c55e', icon: 'Router' }, // green — live service
  { name: 'Aerial Fiber Cable', geometryType: 'LineString', color: '#f97316', icon: null }, // comms orange
  { name: 'Underground Fiber Cable', geometryType: 'LineString', color: '#9a3412', icon: null }, // burnt/buried orange
  { name: 'Drop Cable', geometryType: 'LineString', color: '#fbbf24', icon: null }, // amber, last-mile
  { name: 'Service Area', geometryType: 'Polygon', color: '#6366f1', icon: null }, // muted background zone
];

const A = NETWORK_ASSET_STATUS.APPROVED;
const P = NETWORK_ASSET_STATUS.PENDING;
const R = NETWORK_ASSET_STATUS.REJECTED;

(async () => {
  try {
    await mainDb.sequelize.authenticate();
    const { slug, adminEmail } = config.seed.demoOrg;

    const organization = await mainDb.Organization.findOne({ where: { slug } });
    if (!organization) {
      logger.error('Demo organization not found — run `npm run seed:demo-org` first.');
      process.exit(1);
    }

    if (organization.name !== COMPANY_NAME) {
      await organization.update({ name: COMPANY_NAME });
      logger.info(`🏢 Renamed organization to "${COMPANY_NAME}".`);
    }

    const { models } = await connectionManager.getConnection(organization);
    const adminUser = await models.User.findOne({ where: { email: adminEmail } });
    if (!adminUser) {
      logger.error('Demo admin user not found — run `npm run seed:demo-org` first.');
      process.exit(1);
    }

    // Clean slate — network_assets.project_id is ON DELETE RESTRICT, so
    // assets must go before projects; project_symbologies cascades away with
    // its project automatically.
    await models.NetworkAsset.destroy({ where: {}, force: true });
    await models.Project.destroy({ where: {}, force: true });
    await models.Symbology.destroy({ where: {}, force: true });

    // Re-runs shouldn't pile up duplicate field crew accounts.
    const surveyorRole = await models.Role.findOne({ where: { slug: 'surveyor' } });
    const staleSurveyors = await models.User.findAll({ where: { roleId: surveyorRole.id } });
    for (const u of staleSurveyors) {
      // eslint-disable-next-line no-await-in-loop
      await u.destroy({ force: true });
      // eslint-disable-next-line no-await-in-loop
      await orgDirectory.remove(u.email);
    }
    logger.info('🧹 Cleared existing demo projects, symbologies, assets, and field crew.');

    // --- Field crew (Surveyor role) — the people who actually submit field
    // data. The org admin only reviews; assets should never be attributed to
    // them as the submitter.
    const crew = {};
    for (const person of FIELD_CREW) {
      // eslint-disable-next-line no-await-in-loop
      crew[person.firstName] = await fieldTeamService.create(models, organization, { ...person, password: FIELD_CREW_PASSWORD });
    }
    const marcus = crew.Marcus;
    const diego = crew.Diego;
    logger.info(`👷 Added ${FIELD_CREW.length} field crew members (Surveyor role).`);

    // --- Symbologies ---
    const sym = {};
    for (const def of SYMBOLOGY_DEFS) {
      // eslint-disable-next-line no-await-in-loop
      sym[def.name] = await models.Symbology.create({ name: def.name, key: slugify(def.name), geometryType: def.geometryType, color: def.color, icon: def.icon });
    }
    logger.info(`🎨 Created ${SYMBOLOGY_DEFS.length} OFC symbologies.`);

    // --- Projects ---
    const backbone = await models.Project.create({
      name: 'SoMa Fiber Backbone – Phase 2',
      description: 'Underground and aerial fiber backbone build-out through SoMa, connecting core distribution hubs to the metro ring.',
      status: 'active',
    });
    const ftth = await models.Project.create({
      name: 'Sunset District FTTH Buildout',
      description: 'Fiber-to-the-home last-mile construction along the Judah corridor.',
      status: 'active',
    });
    const allSymbologyIds = Object.values(sym).map((s) => s.id);
    await backbone.setSymbologies(allSymbologyIds);
    await ftth.setSymbologies(allSymbologyIds);
    logger.info('📁 Created 2 projects and assigned the full symbology catalog to each.');

    // --- Network assets ---
    // `submittedBy` is always a field crew member — the admin only reviews
    // (sets reviewedByUserId), it never creates the submission itself.
    function asset({ project, symbology, geometry, attributes, status, submittedBy, reviewed, rejectionReason }) {
      return {
        projectId: project.id,
        symbologyId: symbology.id,
        assetType: symbology.key,
        geometryType: geometry.type,
        geom: geometry,
        attributes,
        status,
        createdByUserId: submittedBy.id,
        ...(reviewed ? { reviewedByUserId: adminUser.id, reviewedAt: new Date() } : {}),
        ...(rejectionReason ? { rejectionReason } : {}),
      };
    }

    const rows = [
      // ---- SoMa Fiber Backbone – Phase 2 (mostly built & approved) — Marcus Webb's crew ----
      asset({
        project: backbone,
        symbology: sym['Underground Fiber Cable'],
        geometry: { type: 'LineString', coordinates: [[-122.4194, 37.7749], [-122.413, 37.7788], [-122.407, 37.7822], [-122.401, 37.7855]] },
        attributes: { conduitType: 'HDPE 1.25in', fiberCount: 288, lengthFt: 2450 },
        status: A,
        submittedBy: marcus,
        reviewed: true,
      }),
      asset({
        project: backbone,
        symbology: sym['Aerial Fiber Cable'],
        geometry: { type: 'LineString', coordinates: [[-122.413, 37.7788], [-122.411, 37.781]] },
        attributes: { fiberCount: 144, lengthFt: 620 },
        status: A,
        submittedBy: marcus,
        reviewed: true,
      }),
      asset({ project: backbone, symbology: sym['Handhole'], geometry: { type: 'Point', coordinates: [-122.4194, 37.7749] }, attributes: { accessId: 'HH-101', size: '24x36 in', material: 'Polymer Concrete' }, status: A, submittedBy: marcus, reviewed: true }),
      asset({ project: backbone, symbology: sym['Handhole'], geometry: { type: 'Point', coordinates: [-122.416, 37.7768] }, attributes: { accessId: 'HH-102', size: '24x36 in', material: 'Polymer Concrete' }, status: A, submittedBy: marcus, reviewed: true }),
      asset({ project: backbone, symbology: sym['Handhole'], geometry: { type: 'Point', coordinates: [-122.407, 37.7822] }, attributes: { accessId: 'HH-103', size: '30x48 in', material: 'Polymer Concrete' }, status: A, submittedBy: marcus, reviewed: true }),
      asset({ project: backbone, symbology: sym['Splice Closure'], geometry: { type: 'Point', coordinates: [-122.413, 37.7788] }, attributes: { closureId: 'SC-011', closureType: 'Dome', fiberCount: 144 }, status: A, submittedBy: marcus, reviewed: true }),
      asset({ project: backbone, symbology: sym['Splice Closure'], geometry: { type: 'Point', coordinates: [-122.401, 37.7855] }, attributes: { closureId: 'SC-012', closureType: 'In-line', fiberCount: 288 }, status: A, submittedBy: marcus, reviewed: true }),
      asset({ project: backbone, symbology: sym['Utility Pole'], geometry: { type: 'Point', coordinates: [-122.413, 37.7788] }, attributes: { poleId: 'P-201', material: 'Wood', heightFt: 35, ownership: 'Joint Use' }, status: A, submittedBy: marcus, reviewed: true }),
      asset({ project: backbone, symbology: sym['Utility Pole'], geometry: { type: 'Point', coordinates: [-122.411, 37.781] }, attributes: { poleId: 'P-202', material: 'Wood', heightFt: 35, ownership: 'Joint Use' }, status: A, submittedBy: marcus, reviewed: true }),
      asset({ project: backbone, symbology: sym['Fiber Distribution Hub'], geometry: { type: 'Point', coordinates: [-122.416, 37.7768] }, attributes: { cabinetModel: 'FDH-288', portCapacity: 288, hubId: 'FDH-01' }, status: A, submittedBy: marcus, reviewed: true }),
      asset({ project: backbone, symbology: sym['Manhole'], geometry: { type: 'Point', coordinates: [-122.407, 37.7822] }, attributes: { vaultType: 'Traffic-rated', depthFt: 4, vaultId: 'V-05' }, status: A, submittedBy: marcus, reviewed: true }),
      asset({
        project: backbone,
        symbology: sym['Service Area'],
        geometry: { type: 'Polygon', coordinates: [[[-122.421, 37.773], [-122.421, 37.787], [-122.399, 37.787], [-122.399, 37.773], [-122.421, 37.773]]] },
        attributes: { areaName: 'SoMa Fiber Zone', homesPassed: 2400, businessesPassed: 340 },
        status: A,
        submittedBy: marcus,
        reviewed: true,
      }),
      // Recently surveyed, awaiting review — the "pending orders" queue.
      asset({ project: backbone, symbology: sym['Handhole'], geometry: { type: 'Point', coordinates: [-122.4055, 37.7845] }, attributes: { accessId: 'HH-104', size: '24x36 in', material: 'Polymer Concrete' }, status: P, submittedBy: marcus }),
      asset({ project: backbone, symbology: sym['Handhole'], geometry: { type: 'Point', coordinates: [-122.403, 37.785] }, attributes: { accessId: 'HH-105', size: '24x36 in', material: 'Polymer Concrete' }, status: P, submittedBy: marcus }),
      // A rejected submission, with a reason — the full review journey.
      asset({
        project: backbone,
        symbology: sym['Splice Closure'],
        geometry: { type: 'Point', coordinates: [-122.418, 37.7758] },
        attributes: { closureId: 'SC-014', closureType: 'Dome', fiberCount: 144 },
        status: R,
        submittedBy: marcus,
        reviewed: true,
        rejectionReason: 'Duplicate of existing closure SC-011 — GPS pin looks mis-recorded, please resurvey.',
      }),

      // ---- Sunset District FTTH Buildout (last-mile, actively in review) — Diego Ramirez's crew ----
      asset({
        project: ftth,
        symbology: sym['Aerial Fiber Cable'],
        geometry: { type: 'LineString', coordinates: [[-122.485, 37.753], [-122.483, 37.753], [-122.481, 37.753]] },
        attributes: { fiberCount: 48, lengthFt: 980 },
        status: A,
        submittedBy: diego,
        reviewed: true,
      }),
      asset({ project: ftth, symbology: sym['Utility Pole'], geometry: { type: 'Point', coordinates: [-122.485, 37.753] }, attributes: { poleId: 'P-301', material: 'Wood', heightFt: 30, ownership: 'PG&E Joint Use' }, status: A, submittedBy: diego, reviewed: true }),
      asset({ project: ftth, symbology: sym['Utility Pole'], geometry: { type: 'Point', coordinates: [-122.483, 37.753] }, attributes: { poleId: 'P-302', material: 'Wood', heightFt: 30, ownership: 'PG&E Joint Use' }, status: A, submittedBy: diego, reviewed: true }),
      asset({ project: ftth, symbology: sym['Utility Pole'], geometry: { type: 'Point', coordinates: [-122.481, 37.753] }, attributes: { poleId: 'P-303', material: 'Wood', heightFt: 30, ownership: 'PG&E Joint Use' }, status: A, submittedBy: diego, reviewed: true }),
      asset({ project: ftth, symbology: sym['Drop Cable'], geometry: { type: 'LineString', coordinates: [[-122.485, 37.753], [-122.485, 37.7524]] }, attributes: { fiberCount: 2, lengthFt: 120 }, status: A, submittedBy: diego, reviewed: true }),
      asset({ project: ftth, symbology: sym['Drop Cable'], geometry: { type: 'LineString', coordinates: [[-122.483, 37.753], [-122.483, 37.7524]] }, attributes: { fiberCount: 2, lengthFt: 115 }, status: A, submittedBy: diego, reviewed: true }),
      asset({ project: ftth, symbology: sym['Drop Cable'], geometry: { type: 'LineString', coordinates: [[-122.481, 37.753], [-122.481, 37.7524]] }, attributes: { fiberCount: 2, lengthFt: 118 }, status: P, submittedBy: diego }),
      asset({ project: ftth, symbology: sym['Drop Cable'], geometry: { type: 'LineString', coordinates: [[-122.482, 37.753], [-122.482, 37.7536]] }, attributes: { fiberCount: 2, lengthFt: 130 }, status: P, submittedBy: diego }),
      asset({ project: ftth, symbology: sym['ONT (Customer Terminal)'], geometry: { type: 'Point', coordinates: [-122.485, 37.7524] }, attributes: { model: 'Calix 844G', serviceTier: '1 Gbps', customerAccount: 'ACCT-88210' }, status: A, submittedBy: diego, reviewed: true }),
      asset({ project: ftth, symbology: sym['ONT (Customer Terminal)'], geometry: { type: 'Point', coordinates: [-122.483, 37.7524] }, attributes: { model: 'Calix 844G', serviceTier: '1 Gbps', customerAccount: 'ACCT-88214' }, status: A, submittedBy: diego, reviewed: true }),
      asset({ project: ftth, symbology: sym['ONT (Customer Terminal)'], geometry: { type: 'Point', coordinates: [-122.481, 37.7524] }, attributes: { model: 'Calix 844G', serviceTier: '1 Gbps', customerAccount: 'ACCT-88219' }, status: P, submittedBy: diego }),
      asset({ project: ftth, symbology: sym['ONT (Customer Terminal)'], geometry: { type: 'Point', coordinates: [-122.482, 37.7536] }, attributes: { model: 'Calix 844G', serviceTier: '500 Mbps', customerAccount: 'ACCT-88223' }, status: P, submittedBy: diego }),
      asset({ project: ftth, symbology: sym['Handhole'], geometry: { type: 'Point', coordinates: [-122.484, 37.753] }, attributes: { accessId: 'HH-201', size: '17x30 in', material: 'Polymer Concrete' }, status: P, submittedBy: diego }),
      asset({ project: ftth, symbology: sym['Splice Closure'], geometry: { type: 'Point', coordinates: [-122.482, 37.753] }, attributes: { closureId: 'SC-020', closureType: 'Dome', fiberCount: 48 }, status: P, submittedBy: diego }),
    ];

    await models.NetworkAsset.bulkCreate(rows);

    const counts = rows.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {});
    logger.info(`🧵 Seeded ${rows.length} network assets across 2 projects — ${JSON.stringify(counts)}.`);
    logger.info(`🎉 OFC demo ready. Log in at the client panel with ${adminEmail} / (your SEED_DEMO_ADMIN_PASSWORD).`);
    process.exit(0);
  } catch (err) {
    logger.error(`OFC demo seed failed: ${err.stack || err.message}`);
    process.exit(1);
  }
})();
