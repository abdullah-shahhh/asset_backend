'use strict';

/**
 * Seed the MAIN database:
 *   1. Platform permission catalog + the Super Admin role (bypasses checks).
 *   2. Bootstrap superadmin user (SEED_SUPERADMIN_* env).
 *   3. The OFC module + its default survey template (doc §3.2 asset types:
 *      cable segment, splice closure, pole, manhole, ONT).
 *
 * Idempotent — safe to re-run.
 */

const config = require('../src/config');
const logger = require('../src/config/logger');
const { mainDb } = require('../src/database');
const { PERMISSION_CATALOG } = require('../src/config/constants');

const OFC_SCHEMA = {
  assetTypes: [
    {
      key: 'cable_segment',
      label: 'Cable Segment',
      geometryType: 'LineString',
      icon: 'cable',
      color: '#2563eb',
      fields: [
        { key: 'cableType', label: 'Cable Type', type: 'select', required: true, options: ['Aerial', 'Underground', 'Duct'] },
        { key: 'coreCount', label: 'Core Count', type: 'number', required: true },
        { key: 'lengthMeters', label: 'Length (m)', type: 'number', required: false },
        { key: 'notes', label: 'Notes', type: 'textarea', required: false },
      ],
    },
    {
      key: 'splice_closure',
      label: 'Splice Closure',
      geometryType: 'Point',
      icon: 'splice',
      color: '#f59e0b',
      fields: [
        { key: 'closureType', label: 'Closure Type', type: 'select', required: true, options: ['Aerial', 'Underground', 'Wall-mounted'] },
        { key: 'capacity', label: 'Splice Capacity', type: 'number', required: false },
      ],
    },
    {
      key: 'pole',
      label: 'Pole',
      geometryType: 'Point',
      icon: 'pole',
      color: '#16a34a',
      fields: [
        { key: 'material', label: 'Material', type: 'select', required: true, options: ['Wood', 'Concrete', 'Steel'] },
        { key: 'heightMeters', label: 'Height (m)', type: 'number', required: false },
        { key: 'ownership', label: 'Ownership', type: 'text', required: false },
      ],
    },
    {
      key: 'manhole',
      label: 'Manhole',
      geometryType: 'Point',
      icon: 'manhole',
      color: '#6b7280',
      fields: [
        { key: 'manholeType', label: 'Manhole Type', type: 'select', required: true, options: ['Type A', 'Type B', 'Type C'] },
        { key: 'depthMeters', label: 'Depth (m)', type: 'number', required: false },
      ],
    },
    {
      key: 'ont',
      label: 'ONT',
      geometryType: 'Point',
      icon: 'ont',
      color: '#dc2626',
      fields: [
        { key: 'serialNumber', label: 'Serial Number', type: 'text', required: true },
        { key: 'customerName', label: 'Customer Name', type: 'text', required: false },
      ],
    },
  ],
};

(async () => {
  try {
    await mainDb.sequelize.authenticate();

    // 1. Permission catalog.
    await mainDb.Permission.bulkCreate(
      PERMISSION_CATALOG.map((p) => ({ key: p.key, group: p.group, label: p.label })),
      { ignoreDuplicates: true }
    );
    const permissions = await mainDb.Permission.findAll();
    logger.info(`✅ Seeded ${permissions.length} platform permissions.`);

    // 2. Super Admin role.
    let superAdminRole = await mainDb.Role.findOne({ where: { slug: 'super-admin' } });
    if (!superAdminRole) {
      superAdminRole = await mainDb.Role.create({
        name: 'Super Admin',
        slug: 'super-admin',
        description: 'Full platform access.',
        isSystem: true,
        isSuperAdmin: true,
      });
    }
    await superAdminRole.setPermissions(permissions);
    logger.info(`✅ Super Admin role ready (id=${superAdminRole.id}).`);

    // 3. Bootstrap superadmin user.
    const { name, email, password } = config.seed.superAdmin;
    const [firstName, ...rest] = name.split(' ');
    let user = await mainDb.User.findOne({ where: { email } });
    if (!user) {
      user = await mainDb.User.create({
        roleId: superAdminRole.id,
        firstName,
        lastName: rest.join(' ') || null,
        email,
        password,
        status: 'active',
      });
      logger.info(`✅ Bootstrap superadmin created: ${email}`);
    } else {
      logger.info(`Superadmin ${email} already exists.`);
    }

    // 4. OFC module + default survey template.
    const [ofcModule] = await mainDb.Module.findOrCreate({
      where: { key: 'OFC' },
      defaults: { key: 'OFC', name: 'OFC / Fiber', description: 'Fiber network survey and asset mapping.' },
    });

    const existingTemplate = await mainDb.SurveyTemplate.findOne({ where: { moduleId: ofcModule.id, isActive: true } });
    if (!existingTemplate) {
      await mainDb.SurveyTemplate.create({
        moduleId: ofcModule.id,
        name: 'OFC Default Survey Template',
        version: 1,
        schemaJson: OFC_SCHEMA,
        isActive: true,
      });
      logger.info('✅ OFC default survey template created.');
    } else {
      logger.info('OFC survey template already exists.');
    }

    logger.info('🎉 Main DB seed complete.');
    process.exit(0);
  } catch (err) {
    logger.error(`Seed failed: ${err.stack || err.message}`);
    process.exit(1);
  }
})();
