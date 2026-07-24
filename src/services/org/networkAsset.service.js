'use strict';

const { Op } = require('sequelize');
const { getPaginationParams, buildPaginationMeta } = require('../../helpers/pagination.helper');
const { assetsToFeatureCollection, assetToFeature } = require('../../helpers/geojson.helper');
const auditHelper = require('../../helpers/audit.helper');
const { NETWORK_ASSET_STATUS, OPERATIONAL_STATUS, AUDIT_ACTIONS, AUTH_REALM } = require('../../config/constants');
const ApiError = require('../../utils/ApiError');

const SYMBOLOGY_INCLUDE = { association: 'symbology' };
const CREATED_BY_INCLUDE = { association: 'createdBy', attributes: ['id', 'firstName', 'lastName', 'email'] };
const REVIEWED_BY_INCLUDE = { association: 'reviewedBy', attributes: ['id', 'firstName', 'lastName', 'email'] };
const PROJECT_INCLUDE = { association: 'project', attributes: ['id', 'name'] };
const MEDIA_INCLUDE = { association: 'media' };
const REVIEW_INCLUDES = [SYMBOLOGY_INCLUDE, CREATED_BY_INCLUDE, REVIEWED_BY_INCLUDE, PROJECT_INCLUDE, MEDIA_INCLUDE];

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

/**
 * Only Org Admins (bypass-all role) may submit to any project regardless of
 * assignment — everyone else (Surveyor-role field crew, or any other
 * non-admin role) must be assigned to the project via ProjectSurveyor.
 */
async function assertProjectAssignment(models, projectId, user, isSuperAdmin) {
  if (isSuperAdmin) return;
  const assigned = await models.ProjectSurveyor.findOne({ where: { projectId, userId: user.id } });
  if (!assigned) throw ApiError.forbidden('You are not assigned to this project');
}

async function list(models, query) {
  const where = {};
  if (query.projectId) where.projectId = query.projectId;
  if (query.status) where.status = query.status;
  if (query.symbologyId) where.symbologyId = query.symbologyId;
  if (query.assetType) where.assetType = query.assetType;
  if (query.ipAddress) where.ipAddress = { [Op.iLike]: `%${query.ipAddress}%` };

  const { page, limit, offset, order } = getPaginationParams(query);
  const { count, rows } = await models.NetworkAsset.findAndCountAll({
    where,
    include: REVIEW_INCLUDES,
    limit,
    offset,
    order,
  });
  return {
    featureCollection: assetsToFeatureCollection(rows),
    pagination: buildPaginationMeta(count, page, limit),
  };
}

/** Cross-project "is anything unhealthy right now" view — degraded/offline
 * equipment plus actively-faulted cables (the demo fault-simulation flag). */
async function listAlarms(models) {
  const [equipment, faults] = await Promise.all([
    models.NetworkAsset.findAll({
      where: { operationalStatus: { [Op.in]: [OPERATIONAL_STATUS.DEGRADED, OPERATIONAL_STATUS.OFFLINE] } },
      include: REVIEW_INCLUDES,
      order: [['updatedAt', 'DESC']],
    }),
    models.NetworkAsset.findAll({
      where: { attributes: { faultActive: true } },
      include: REVIEW_INCLUDES,
      order: [['updatedAt', 'DESC']],
    }),
  ]);
  return {
    equipment: equipment.map(assetToFeature),
    faults: faults.map(assetToFeature),
  };
}

async function getById(models, id) {
  const asset = await models.NetworkAsset.findByPk(id, { include: REVIEW_INCLUDES });
  if (!asset) throw ApiError.notFound('Network asset not found');
  return asset;
}

async function create(models, organization, user, { projectId, symbologyId, geometry, attributes }, isSuperAdmin) {
  const project = await models.Project.findByPk(projectId);
  if (!project) throw ApiError.badRequest('Invalid project');
  await assertProjectAssignment(models, projectId, user, isSuperAdmin);

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
async function importFeatureCollection(models, organization, user, { projectId, featureCollection }, isSuperAdmin) {
  const project = await models.Project.findByPk(projectId, { include: [{ association: 'symbologies' }] });
  if (!project) throw ApiError.badRequest('Invalid project');
  await assertProjectAssignment(models, projectId, user, isSuperAdmin);

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

async function update(models, id, { geometry, attributes, operationalStatus, ipAddress }) {
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
  if (operationalStatus !== undefined) {
    if (!asset.symbology?.isEquipment) throw ApiError.badRequest('This asset type does not track operational status');
    patch.operationalStatus = operationalStatus;
  }
  if (ipAddress !== undefined) {
    if (!asset.symbology?.isEquipment) throw ApiError.badRequest('This asset type does not track an IP address');
    patch.ipAddress = ipAddress || null;
  }
  await asset.update(patch);
  return getById(models, id);
}

async function remove(models, id) {
  const asset = await getById(models, id);
  await asset.destroy();
  return true;
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

module.exports = { list, listAlarms, getById, create, update, remove, approve, reject, importFeatureCollection, assetToFeature };
