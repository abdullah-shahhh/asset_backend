'use strict';

const { getPaginationParams, buildPaginationMeta } = require('../../helpers/pagination.helper');
const { assetsToFeatureCollection, assetToFeature } = require('../../helpers/geojson.helper');
const auditHelper = require('../../helpers/audit.helper');
const { NETWORK_ASSET_STATUS, AUDIT_ACTIONS, AUTH_REALM } = require('../../config/constants');
const ApiError = require('../../utils/ApiError');

const SYMBOLOGY_INCLUDE = { association: 'symbology' };

/**
 * Resolve a symbology and confirm it has been assigned to the given project —
 * surveys may only draw with whatever symbologies their project was given
 * (the "dynamic symbology" restriction).
 */
async function resolveProjectSymbology(models, projectId, symbologyId) {
  const symbology = await models.Symbology.findByPk(symbologyId, {
    include: [{ association: 'projects', where: { id: projectId }, attributes: ['id'], through: { attributes: [] } }],
  });
  if (!symbology) throw ApiError.badRequest('This symbology is not assigned to the selected project');
  return symbology;
}

async function list(models, query) {
  const where = {};
  if (query.projectId) where.projectId = query.projectId;
  if (query.status) where.status = query.status;
  if (query.symbologyId) where.symbologyId = query.symbologyId;
  if (query.assetType) where.assetType = query.assetType;

  const { page, limit, offset, order } = getPaginationParams(query);
  const { count, rows } = await models.NetworkAsset.findAndCountAll({
    where,
    include: [SYMBOLOGY_INCLUDE],
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
  const asset = await models.NetworkAsset.findByPk(id, { include: [{ association: 'media' }, SYMBOLOGY_INCLUDE] });
  if (!asset) throw ApiError.notFound('Network asset not found');
  return asset;
}

async function create(models, organization, user, { projectId, symbologyId, geometry, attributes }) {
  const project = await models.Project.findByPk(projectId);
  if (!project) throw ApiError.badRequest('Invalid project');

  const symbology = await resolveProjectSymbology(models, projectId, symbologyId);
  if (symbology.geometryType !== geometry.type) {
    throw ApiError.badRequest(`Symbology "${symbology.name}" requires geometry type ${symbology.geometryType}, got ${geometry.type}`);
  }

  const asset = await models.NetworkAsset.create({
    projectId,
    symbologyId: symbology.id,
    assetType: symbology.key,
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
 * properties, matching the KEY of a symbology assigned to the project; the
 * remaining properties become `attributes`. Processed independently
 * per-feature so one bad row doesn't block the rest.
 */
async function importFeatureCollection(models, organization, user, { projectId, featureCollection }) {
  const project = await models.Project.findByPk(projectId, { include: [{ association: 'symbologies' }] });
  if (!project) throw ApiError.badRequest('Invalid project');

  const symbologiesByKey = new Map(project.symbologies.map((s) => [s.key, s]));

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

      const symbology = symbologiesByKey.get(assetType);
      if (!symbology) throw ApiError.badRequest(`"${assetType}" is not a symbology assigned to this project`);
      if (symbology.geometryType !== geometry.type) {
        throw ApiError.badRequest(`Symbology "${symbology.name}" requires geometry type ${symbology.geometryType}, got ${geometry.type}`);
      }

      // eslint-disable-next-line no-await-in-loop
      await models.NetworkAsset.create({
        projectId,
        symbologyId: symbology.id,
        assetType: symbology.key,
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
    if (asset.symbology && asset.symbology.geometryType !== geometry.type) {
      throw ApiError.badRequest(`This asset's symbology requires geometry type ${asset.symbology.geometryType}`);
    }
    patch.geom = geometry;
    patch.geometryType = geometry.type;
  }
  if (attributes) {
    patch.attributes = { ...asset.attributes, ...attributes };
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
