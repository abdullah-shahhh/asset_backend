'use strict';

const { mainDb } = require('../../database');
const { getPaginationParams, buildPaginationMeta } = require('../../helpers/pagination.helper');
const { assetsToFeatureCollection, assetToFeature } = require('../../helpers/geojson.helper');
const auditHelper = require('../../helpers/audit.helper');
const { NETWORK_ASSET_STATUS, AUDIT_ACTIONS, AUTH_REALM } = require('../../config/constants');
const surveyTemplateService = require('../admin/surveyTemplate.service');
const ApiError = require('../../utils/ApiError');

/** Look up the asset-type definition for a module + assetType from its active survey template. */
async function resolveAssetTypeDef(moduleId, assetType) {
  const template = await surveyTemplateService.getActiveForModule(moduleId);
  const def = (template.schemaJson.assetTypes || []).find((t) => t.key === assetType);
  if (!def) throw ApiError.badRequest(`Unknown asset type "${assetType}" for this module's survey template`);
  return def;
}

/** Validate submitted attributes against the asset type's required fields. */
function validateAttributes(def, attributes = {}) {
  const missing = (def.fields || [])
    .filter((f) => f.required)
    .filter((f) => attributes[f.key] === undefined || attributes[f.key] === null || attributes[f.key] === '')
    .map((f) => f.key);
  if (missing.length) {
    throw ApiError.badRequest(`Missing required field(s): ${missing.join(', ')}`, missing.map((f) => ({ field: f })));
  }
}

/** Ensure the module is enabled for the organization (doc §3.3). */
async function assertModuleEnabled(organizationId, moduleId) {
  const link = await mainDb.OrganizationModule.findOne({ where: { organizationId, moduleId } });
  if (!link) throw ApiError.forbidden('This module is not enabled for your organization');
}

async function list(models, query) {
  const where = {};
  if (query.projectId) where.projectId = query.projectId;
  if (query.status) where.status = query.status;
  if (query.moduleId) where.moduleId = query.moduleId;
  if (query.assetType) where.assetType = query.assetType;

  const { page, limit, offset, order } = getPaginationParams(query);
  const { count, rows } = await models.NetworkAsset.findAndCountAll({
    where,
    limit,
    offset,
    order,
  });
  return {
    featureCollection: assetsToFeatureCollection(rows),
    pagination: buildPaginationMeta(count, page, limit),
  };
}

async function getById(models, id) {
  const asset = await models.NetworkAsset.findByPk(id, { include: [{ association: 'media' }] });
  if (!asset) throw ApiError.notFound('Network asset not found');
  return asset;
}

async function create(models, organization, user, { projectId, moduleId, assetType, geometry, attributes }) {
  const project = await models.Project.findByPk(projectId);
  if (!project) throw ApiError.badRequest('Invalid project');

  await assertModuleEnabled(organization.id, moduleId);
  const def = await resolveAssetTypeDef(moduleId, assetType);
  if (def.geometryType !== geometry.type) {
    throw ApiError.badRequest(`Asset type "${assetType}" requires geometry type ${def.geometryType}, got ${geometry.type}`);
  }
  validateAttributes(def, attributes);

  const asset = await models.NetworkAsset.create({
    projectId,
    moduleId,
    assetType,
    geometryType: geometry.type,
    geom: geometry,
    attributes: attributes || {},
    status: NETWORK_ASSET_STATUS.PENDING,
    createdByUserId: user.id,
  });

  return getById(models, asset.id);
}

/**
 * Bulk-create assets from an uploaded GeoJSON FeatureCollection ("import"
 * survey data captured elsewhere). Each feature must carry `assetType` in its
 * properties; the remaining properties become `attributes`. Processed
 * independently per-feature so one bad row doesn't block the rest — returns a
 * summary the UI can show.
 */
async function importFeatureCollection(models, organization, user, { projectId, moduleId, featureCollection }) {
  const project = await models.Project.findByPk(projectId);
  if (!project) throw ApiError.badRequest('Invalid project');
  await assertModuleEnabled(organization.id, moduleId);

  const features = featureCollection?.features || [];
  if (!features.length) throw ApiError.badRequest('No features found in the uploaded file');

  let created = 0;
  const errors = [];

  for (let i = 0; i < features.length; i += 1) {
    const feature = features[i];
    try {
      const { assetType, ...attributes } = feature.properties || {};
      if (!assetType) throw ApiError.badRequest('Missing "assetType" in feature properties');
      const geometry = feature.geometry;
      if (!geometry) throw ApiError.badRequest('Feature has no geometry');

      // eslint-disable-next-line no-await-in-loop
      const def = await resolveAssetTypeDef(moduleId, assetType);
      if (def.geometryType !== geometry.type) {
        throw ApiError.badRequest(`Asset type "${assetType}" requires geometry type ${def.geometryType}, got ${geometry.type}`);
      }
      validateAttributes(def, attributes);

      // eslint-disable-next-line no-await-in-loop
      await models.NetworkAsset.create({
        projectId,
        moduleId,
        assetType,
        geometryType: geometry.type,
        geom: geometry,
        attributes,
        status: NETWORK_ASSET_STATUS.PENDING,
        createdByUserId: user.id,
      });
      created += 1;
    } catch (err) {
      errors.push({ index: i, message: err.message || 'Unknown error' });
    }
  }

  return { total: features.length, created, failed: errors.length, errors };
}

async function update(models, id, { geometry, attributes }) {
  const asset = await getById(models, id);
  const patch = {};
  if (geometry) {
    const def = await resolveAssetTypeDef(asset.moduleId, asset.assetType);
    if (def.geometryType !== geometry.type) {
      throw ApiError.badRequest(`Asset type "${asset.assetType}" requires geometry type ${def.geometryType}`);
    }
    patch.geom = geometry;
    patch.geometryType = geometry.type;
  }
  if (attributes) {
    const def = await resolveAssetTypeDef(asset.moduleId, asset.assetType);
    const merged = { ...asset.attributes, ...attributes };
    validateAttributes(def, merged);
    patch.attributes = merged;
  }
  await asset.update(patch);
  return getById(models, id);
}

async function approve(models, id, reviewer, { req } = {}) {
  const asset = await getById(models, id);
  await asset.update({
    status: NETWORK_ASSET_STATUS.APPROVED,
    reviewedByUserId: reviewer.id,
    reviewedAt: new Date(),
    rejectionReason: null,
  });
  auditHelper.record({
    action: AUDIT_ACTIONS.APPROVE,
    entity: 'NetworkAsset',
    entityId: id,
    actorId: reviewer.id,
    actorRealm: AUTH_REALM.ORG,
    organizationId: req?.organization?.id,
    req,
  });
  return getById(models, id);
}

async function reject(models, id, reviewer, reason, { req } = {}) {
  const asset = await getById(models, id);
  await asset.update({
    status: NETWORK_ASSET_STATUS.REJECTED,
    reviewedByUserId: reviewer.id,
    reviewedAt: new Date(),
    rejectionReason: reason || null,
  });
  auditHelper.record({
    action: AUDIT_ACTIONS.REJECT,
    entity: 'NetworkAsset',
    entityId: id,
    actorId: reviewer.id,
    actorRealm: AUTH_REALM.ORG,
    organizationId: req?.organization?.id,
    metadata: { reason },
    req,
  });
  return getById(models, id);
}

module.exports = { list, getById, create, update, approve, reject, importFeatureCollection, assetToFeature };
