'use strict';

/**
 * Adds a complete, realistic OFC network demo project to the existing demo
 * org — NOT destructive (unlike seed-ofc-demo.js): does not touch existing
 * projects/symbologies/assets, only adds to them. Safe to re-run on a fresh
 * VM after `npm run migrate:tenants` to reproduce the exact same demo state.
 *
 * Adds: 8 new symbologies (Cabinet, ODF, Tower, Duct, Route, Survey Area,
 * Project Boundary, Exchange Compound) with proper per-symbology attribute
 * schemas, flags the 3 existing cable symbologies isCable so strands can be
 * generated on any cable, one new project ("Downtown Exchange OFC Network")
 * with a full backbone-to-customer network (poles, handholes, splice
 * closures, cabinet, ODF, tower, ducts, a planned route, drop cables, ONTs),
 * real NetworkConnection topology (pole<->cable<->pole, cable<->closure,
 * closure<->cabinet, cabinet<->ODF), 96-strand + 48-strand fiber generation
 * on the two main cables with TIA-598 tube/color assignment, equipment ports
 * on the ODF and Cabinet, two real splices tying a backbone strand through to
 * an ODF port and into the aerial strand (so Trace Impact has something real
 * to show), and two customers linked to the ONTs.
 */

const config = require('../src/config');
const logger = require('../src/config/logger');
const { mainDb, connectionManager } = require('../src/database');
const { NETWORK_ASSET_STATUS, STRAND_STATUS } = require('../src/config/constants');

const PROJECT_NAME = 'Downtown Exchange OFC Network';

const TIA598_COLORS = ['Blue', 'Orange', 'Green', 'Brown', 'Slate', 'White', 'Red', 'Black', 'Yellow', 'Violet', 'Rose', 'Aqua'];

function slugify(str) {
  return String(str).toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

const STRUCTURE_FIELDS = [
  { key: 'condition', label: 'Condition', type: 'select', required: true, options: ['Good', 'Fair', 'Poor', 'Damaged'] },
  { key: 'owner', label: 'Owner', type: 'text' },
  { key: 'manufacturer', label: 'Manufacturer', type: 'text' },
  { key: 'installationDate', label: 'Installation Date', type: 'date' },
  { key: 'city', label: 'City', type: 'text' },
  { key: 'district', label: 'District', type: 'text' },
];
const CABLE_FIELDS = [
  { key: 'fiberCount', label: 'Fiber Count', type: 'select', required: true, options: ['12', '24', '48', '96', '144', '288'] },
  { key: 'condition', label: 'Condition', type: 'select', options: ['Good', 'Fair', 'Poor', 'Damaged'] },
  { key: 'manufacturer', label: 'Manufacturer', type: 'text' },
  { key: 'installationDate', label: 'Installation Date', type: 'date' },
  { key: 'city', label: 'City', type: 'text' },
  { key: 'district', label: 'District', type: 'text' },
];
const AREA_FIELDS = [
  { key: 'city', label: 'City', type: 'text' },
  { key: 'district', label: 'District', type: 'text' },
];

const NEW_SYMBOLOGY_DEFS = [
  { name: 'Cabinet', geometryType: 'Point', color: '#0ea5e9', icon: 'Building2', isEquipment: true, fields: STRUCTURE_FIELDS },
  { name: 'ODF', geometryType: 'Point', color: '#4338ca', icon: 'Router', isEquipment: true, fields: STRUCTURE_FIELDS },
  { name: 'Tower', geometryType: 'Point', color: '#dc2626', icon: 'Antenna', isEquipment: true, fields: STRUCTURE_FIELDS },
  { name: 'Duct', geometryType: 'LineString', color: '#78716c', isCable: false, fields: CABLE_FIELDS },
  { name: 'Route', geometryType: 'LineString', color: '#94a3b8', isCable: false, fields: CABLE_FIELDS },
  { name: 'Survey Area', geometryType: 'Polygon', color: '#eab308', fields: AREA_FIELDS },
  { name: 'Project Boundary', geometryType: 'Polygon', color: '#f43f5e', fields: AREA_FIELDS },
  { name: 'Exchange Compound', geometryType: 'Polygon', color: '#14b8a6', fields: AREA_FIELDS },
];

const A = NETWORK_ASSET_STATUS.APPROVED;

function generateStrandRows(networkAssetId, strandCount) {
  return Array.from({ length: strandCount }, (_, i) => {
    const strandNumber = i + 1;
    return {
      networkAssetId,
      strandNumber,
      tubeNumber: Math.ceil(strandNumber / 12),
      color: TIA598_COLORS[(strandNumber - 1) % 12],
      status: strandNumber <= Math.ceil(strandCount * 0.35) ? STRAND_STATUS.IN_SERVICE : STRAND_STATUS.AVAILABLE,
    };
  });
}

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

    const adminUser = await models.User.findOne({ where: { email: adminEmail } });
    const marcus = await models.User.findOne({ where: { email: 'marcus.webb@meridianfiber-demo.local' } });
    const diego = await models.User.findOne({ where: { email: 'diego.ramirez@meridianfiber-demo.local' } });
    const crew = marcus || adminUser;
    const crew2 = diego || adminUser;
    if (!adminUser) {
      logger.error('Demo admin user not found — run `npm run seed:demo-org` first.');
      process.exit(1);
    }

    const existing = await models.Project.findOne({ where: { name: PROJECT_NAME } });
    if (existing) {
      logger.info(`"${PROJECT_NAME}" already exists — this script is additive/non-destructive and won't re-create it. Delete it manually first if you want a clean rebuild.`);
      process.exit(0);
    }

    // --- Flag the existing cable symbologies isCable so strands can be
    // generated on ANY cable in the org, not just new ones, and backfill
    // per-symbology fields on existing types that don't have any yet.
    const cableNames = ['Aerial Fiber Cable', 'Underground Fiber Cable', 'Drop Cable'];
    const structureNames = ['Utility Pole', 'Handhole', 'Manhole', 'Splice Closure', 'Fiber Distribution Hub', 'ONT (Customer Terminal)'];
    for (const name of cableNames) {
      // eslint-disable-next-line no-await-in-loop
      const s = await models.Symbology.findOne({ where: { name } });
      if (s && (!s.isCable || !s.fields.length)) {
        // eslint-disable-next-line no-await-in-loop
        await s.update({ isCable: true, fields: s.fields.length ? s.fields : CABLE_FIELDS });
      }
    }
    for (const name of structureNames) {
      // eslint-disable-next-line no-await-in-loop
      const s = await models.Symbology.findOne({ where: { name } });
      if (s && !s.fields.length) {
        // eslint-disable-next-line no-await-in-loop
        await s.update({ fields: STRUCTURE_FIELDS });
      }
    }
    logger.info('🔧 Flagged existing cable symbologies isCable and backfilled attribute schemas where missing.');

    // --- New symbologies ---
    const sym = {};
    const existingSyms = await models.Symbology.findAll();
    for (const s of existingSyms) sym[s.name] = s;
    for (const def of NEW_SYMBOLOGY_DEFS) {
      if (sym[def.name]) continue;
      // eslint-disable-next-line no-await-in-loop
      sym[def.name] = await models.Symbology.create({
        name: def.name,
        key: slugify(def.name),
        geometryType: def.geometryType,
        color: def.color,
        icon: def.icon || null,
        isEquipment: !!def.isEquipment,
        isCable: !!def.isCable,
        fields: def.fields,
      });
    }
    logger.info(`🎨 Added ${NEW_SYMBOLOGY_DEFS.length} new symbologies (Cabinet, ODF, Tower, Duct, Route, Survey Area, Project Boundary, Exchange Compound).`);

    // --- Project ---
    const project = await models.Project.create({
      name: PROJECT_NAME,
      description: 'Complete backbone-to-customer OFC network for a downtown exchange area — compound, aerial and underground routes, splice points, and live customer drops.',
      status: 'active',
      surveyType: 'OFC Survey',
      templateFields: CABLE_FIELDS,
      photosRequired: false,
    });
    const allSymbologyIds = Object.values(sym).map((s) => s.id);
    await project.setSymbologies(allSymbologyIds);
    await project.setSurveyors([crew.id, crew2.id].filter((id, i, arr) => arr.indexOf(id) === i));
    logger.info(`📁 Created project "${PROJECT_NAME}" with the full symbology catalog assigned.`);

    function asset({ symbology, geometry, attributes, submittedBy }) {
      return {
        projectId: project.id,
        symbologyId: symbology.id,
        assetType: symbology.key,
        geometryType: geometry.type,
        geom: geometry,
        attributes,
        status: A,
        createdByUserId: submittedBy.id,
        reviewedByUserId: adminUser.id,
        reviewedAt: new Date(),
      };
    }

    const commonAttrs = { condition: 'Good', manufacturer: 'Corning', installationDate: '2026-03-15', city: 'San Francisco', district: 'Downtown' };

    // --- Points ---
    const exchangeCompoundPoly = { type: 'Polygon', coordinates: [[[-122.4001, 37.7945], [-122.4001, 37.7948], [-122.3997, 37.7948], [-122.3997, 37.7945], [-122.4001, 37.7945]]] };
    const odfGeom = { type: 'Point', coordinates: [-122.3999, 37.7946] };
    const cabinetGeom = { type: 'Point', coordinates: [-122.39985, 37.79465] };
    const towerGeom = { type: 'Point', coordinates: [-122.402, 37.793] };
    const poleCoords = [
      [-122.3995, 37.795], [-122.3985, 37.7955], [-122.3975, 37.796], [-122.3965, 37.7965], [-122.3955, 37.797], [-122.3945, 37.7975],
    ];
    const hhCoords = [[-122.3998, 37.7948], [-122.3996, 37.7949], [-122.3993, 37.79495]];
    const sc1Geom = { type: 'Point', coordinates: [-122.3996, 37.7949] };
    const sc2Geom = { type: 'Point', coordinates: [-122.3955, 37.797] };
    const ont1Geom = { type: 'Point', coordinates: [-122.3953, 37.7972] };
    const ont2Geom = { type: 'Point', coordinates: [-122.3957, 37.7973] };

    const created = {};
    created.odf = await models.NetworkAsset.create(asset({ symbology: sym.ODF, geometry: odfGeom, attributes: { ...commonAttrs, owner: 'Downtown Exchange Co-op' }, submittedBy: crew }));
    created.cabinet = await models.NetworkAsset.create(asset({ symbology: sym.Cabinet, geometry: cabinetGeom, attributes: { ...commonAttrs, owner: 'Downtown Exchange Co-op' }, submittedBy: crew }));
    created.tower = await models.NetworkAsset.create(asset({ symbology: sym.Tower, geometry: towerGeom, attributes: { ...commonAttrs, owner: 'Downtown Exchange Co-op', manufacturer: 'Rohn' }, submittedBy: crew }));

    created.poles = [];
    for (let i = 0; i < poleCoords.length; i++) {
      // eslint-disable-next-line no-await-in-loop
      created.poles.push(await models.NetworkAsset.create(asset({
        symbology: sym['Utility Pole'],
        geometry: { type: 'Point', coordinates: poleCoords[i] },
        attributes: { ...commonAttrs, owner: 'PG&E Joint Use' },
        submittedBy: crew2,
      })));
    }

    created.handholes = [];
    for (let i = 0; i < hhCoords.length; i++) {
      // eslint-disable-next-line no-await-in-loop
      created.handholes.push(await models.NetworkAsset.create(asset({
        symbology: sym.Handhole,
        geometry: { type: 'Point', coordinates: hhCoords[i] },
        attributes: { ...commonAttrs, owner: 'Downtown Exchange Co-op' },
        submittedBy: crew,
      })));
    }

    created.sc1 = await models.NetworkAsset.create(asset({ symbology: sym['Splice Closure'], geometry: sc1Geom, attributes: { ...commonAttrs, owner: 'Downtown Exchange Co-op' }, submittedBy: crew }));
    created.sc2 = await models.NetworkAsset.create(asset({ symbology: sym['Splice Closure'], geometry: sc2Geom, attributes: { ...commonAttrs, owner: 'Downtown Exchange Co-op' }, submittedBy: crew2 }));
    created.ont1 = await models.NetworkAsset.create(asset({ symbology: sym['ONT (Customer Terminal)'], geometry: ont1Geom, attributes: { ...commonAttrs, manufacturer: 'Calix', owner: 'Customer Premises' }, submittedBy: crew2 }));
    created.ont2 = await models.NetworkAsset.create(asset({ symbology: sym['ONT (Customer Terminal)'], geometry: ont2Geom, attributes: { ...commonAttrs, manufacturer: 'Calix', owner: 'Customer Premises' }, submittedBy: crew2 }));

    // --- Lines ---
    created.underground = await models.NetworkAsset.create(asset({
      symbology: sym['Underground Fiber Cable'],
      geometry: { type: 'LineString', coordinates: [cabinetGeom.coordinates, hhCoords[0], hhCoords[1], sc1Geom.coordinates] },
      attributes: { ...commonAttrs, fiberCount: '96' },
      submittedBy: crew,
    }));
    created.duct = await models.NetworkAsset.create(asset({
      symbology: sym.Duct,
      geometry: { type: 'LineString', coordinates: [[-122.39987, 37.79463], [-122.39982, 37.79478], [-122.3996, 37.79488]] },
      attributes: { ...commonAttrs, fiberCount: '96' },
      submittedBy: crew,
    }));
    created.aerial = await models.NetworkAsset.create(asset({
      symbology: sym['Aerial Fiber Cable'],
      geometry: { type: 'LineString', coordinates: [sc1Geom.coordinates, ...poleCoords, sc2Geom.coordinates] },
      attributes: { ...commonAttrs, fiberCount: '48' },
      submittedBy: crew2,
    }));
    created.route = await models.NetworkAsset.create(asset({
      symbology: sym.Route,
      geometry: { type: 'LineString', coordinates: [sc2Geom.coordinates, [-122.3935, 37.798], [-122.3915, 37.799]] },
      attributes: { ...commonAttrs, fiberCount: '144', condition: 'Fair' },
      submittedBy: crew2,
    }));
    created.drop1 = await models.NetworkAsset.create(asset({ symbology: sym['Drop Cable'], geometry: { type: 'LineString', coordinates: [sc2Geom.coordinates, ont1Geom.coordinates] }, attributes: { ...commonAttrs, fiberCount: '12' }, submittedBy: crew2 }));
    created.drop2 = await models.NetworkAsset.create(asset({ symbology: sym['Drop Cable'], geometry: { type: 'LineString', coordinates: [sc2Geom.coordinates, ont2Geom.coordinates] }, attributes: { ...commonAttrs, fiberCount: '12' }, submittedBy: crew2 }));

    // --- Polygons ---
    await models.NetworkAsset.create(asset({ symbology: sym['Exchange Compound'], geometry: exchangeCompoundPoly, attributes: { city: 'San Francisco', district: 'Downtown' }, submittedBy: crew }));
    await models.NetworkAsset.create(asset({
      symbology: sym['Survey Area'],
      geometry: { type: 'Polygon', coordinates: [[[-122.401, 37.793], [-122.401, 37.798], [-122.393, 37.798], [-122.393, 37.793], [-122.401, 37.793]]] },
      attributes: { city: 'San Francisco', district: 'Downtown' },
      submittedBy: crew,
    }));
    await models.NetworkAsset.create(asset({
      symbology: sym['Project Boundary'],
      geometry: { type: 'Polygon', coordinates: [[[-122.403, 37.791], [-122.403, 37.8], [-122.391, 37.8], [-122.391, 37.791], [-122.403, 37.791]]] },
      attributes: { city: 'San Francisco', district: 'Downtown' },
      submittedBy: crew,
    }));

    const assetCount = 3 + poleCoords.length + hhCoords.length + 2 + 2 + 6 + 3;
    logger.info(`🗺️  Seeded ${assetCount} network assets (points, lines, polygons) for "${PROJECT_NAME}".`);

    // --- Connections: Pole<->Cable<->Pole, Cable<->Closure, Closure<->Cabinet, Cabinet<->ODF ---
    const conn = (fromAssetId, toAssetId, label) => models.NetworkConnection.create({ projectId: project.id, fromAssetId, toAssetId, label });
    await conn(created.poles[0].id, created.aerial.id, 'Aerial run start');
    await conn(created.aerial.id, created.poles[created.poles.length - 1].id, 'Aerial run end');
    await conn(created.underground.id, created.sc1.id, 'Backbone to splice');
    await conn(created.aerial.id, created.sc1.id, 'Aerial to splice');
    await conn(created.aerial.id, created.sc2.id, 'Aerial to splice 2');
    await conn(created.sc1.id, created.cabinet.id, 'Splice to cabinet');
    await conn(created.cabinet.id, created.odf.id, 'Cabinet to ODF');
    await conn(created.underground.id, created.cabinet.id, 'Backbone origin');
    logger.info('🔗 Created 8 network connections: pole↔cable↔pole, cable↔closure, closure↔cabinet, cabinet↔ODF.');

    // --- Fiber strands: 96F on the underground backbone, 48F on the aerial run ---
    await models.FiberStrand.bulkCreate(generateStrandRows(created.underground.id, 96));
    await models.FiberStrand.bulkCreate(generateStrandRows(created.aerial.id, 48));
    logger.info('🧵 Generated 96 strands on the underground backbone and 48 strands on the aerial run.');

    // --- Equipment ports on ODF and Cabinet ---
    const odfPorts = await models.EquipmentPort.bulkCreate(
      Array.from({ length: 24 }, (_, i) => ({ networkAssetId: created.odf.id, portNumber: i + 1, status: 'free' })),
      { returning: true }
    );
    const cabinetPorts = await models.EquipmentPort.bulkCreate(
      Array.from({ length: 12 }, (_, i) => ({ networkAssetId: created.cabinet.id, portNumber: i + 1, status: 'free' })),
      { returning: true }
    );
    logger.info('🔌 Generated 24 ports on the ODF and 12 ports on the Cabinet.');

    // --- Real splices so Trace Impact has something to show ---
    const undergroundStrand1 = await models.FiberStrand.findOne({ where: { networkAssetId: created.underground.id, strandNumber: 1 } });
    const aerialStrand1 = await models.FiberStrand.findOne({ where: { networkAssetId: created.aerial.id, strandNumber: 1 } });
    await models.FiberSplice.create({
      projectId: project.id,
      spliceAssetId: created.cabinet.id,
      endAType: 'strand', endAStrandId: undergroundStrand1.id, endAStrandSide: 'Z',
      endBType: 'port', endBPortId: odfPorts[0].id,
      notes: 'Backbone strand 1 into ODF port 1',
    });
    await models.FiberSplice.create({
      projectId: project.id,
      spliceAssetId: created.sc1.id,
      endAType: 'strand', endAStrandId: undergroundStrand1.id, endAStrandSide: 'A',
      endBType: 'strand', endBStrandId: aerialStrand1.id, endBStrandSide: 'A',
      notes: 'Backbone to aerial splice at SC-1',
    });
    await models.EquipmentPort.update({ status: 'connected' }, { where: { id: odfPorts[0].id } });
    await undergroundStrand1.update({ status: STRAND_STATUS.IN_SERVICE });
    await aerialStrand1.update({ status: STRAND_STATUS.IN_SERVICE, role: 'distribution' });
    logger.info('🧷 Created 2 real splices linking the backbone strand through the ODF and into the aerial run.');

    // --- Customers linked to the two ONTs ---
    const cust1 = await models.Customer.create({ name: 'Aria Chen', email: 'aria.chen@example.com', phone: '415-555-0142', address: '212 Market St, San Francisco, CA', networkAssetId: created.ont1.id });
    const cust2 = await models.Customer.create({ name: 'Downtown Grind Cafe', email: 'ops@downtowngrind.example', phone: '415-555-0198', address: '218 Market St, San Francisco, CA', networkAssetId: created.ont2.id });
    await undergroundStrand1.update({ assignedCustomerId: cust1.id, role: 'feeder' });
    await models.Ticket.create({ customerId: cust1.id, subject: 'Intermittent drops in the evening', description: 'Customer reports service drops most evenings around 7-9pm.', status: 'open', priority: 'medium' });
    logger.info('👤 Linked 2 customers to the ONTs and opened 1 support ticket.');

    logger.info(`🎉 "${PROJECT_NAME}" is ready — complete backbone-to-customer OFC network, real strand/splice/connection topology, log in as ${adminEmail}.`);
    process.exit(0);
  } catch (err) {
    logger.error(`OFC network demo seed failed: ${err.stack || err.message}`);
    process.exit(1);
  }
})();
