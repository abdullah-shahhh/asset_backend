'use strict';

const { paginate } = require('../../helpers/pagination.helper');
const ApiError = require('../../utils/ApiError');

async function list(models, query) {
  const where = {};
  if (query.status) where.status = query.status;
  const { rows, pagination } = await paginate(models.Project, query, { where });
  return { projects: rows, pagination };
}

async function getById(models, id) {
  const project = await models.Project.findByPk(id);
  if (!project) throw ApiError.notFound('Project not found');
  return project;
}

async function create(models, { name, description, status, surveyType, templateFields, photosRequired }) {
  return models.Project.create({
    name,
    description,
    status,
    ...(surveyType != null && { surveyType }),
    ...(templateFields != null && { templateFields }),
    ...(photosRequired != null && { photosRequired }),
  });
}

async function update(models, id, { name, description, status, surveyType, templateFields, photosRequired }) {
  const project = await getById(models, id);
  await project.update({
    ...(name != null && { name }),
    ...(description !== undefined && { description }),
    ...(status != null && { status }),
    ...(surveyType != null && { surveyType }),
    ...(templateFields != null && { templateFields }),
    ...(photosRequired != null && { photosRequired }),
  });
  return project;
}

async function remove(models, id) {
  const project = await getById(models, id);
  const assetCount = await models.NetworkAsset.count({ where: { projectId: id } });
  if (assetCount) throw ApiError.conflict('Cannot delete a project that has survey assets');
  await project.destroy();
  return true;
}

/** Surveyors (Surveyor-role users) assigned to a project — who may submit
 * assets into it. */
async function listSurveyors(models, projectId) {
  const project = await models.Project.findByPk(projectId, {
    include: [{ association: 'surveyors', through: { attributes: [] }, attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'status'] }],
  });
  if (!project) throw ApiError.notFound('Project not found');
  return project.surveyors;
}

/** Replace a project's full surveyor assignment set. */
async function setSurveyors(models, projectId, surveyorIds) {
  const project = await getById(models, projectId);

  if (surveyorIds.length) {
    const role = await models.Role.findOne({ where: { slug: 'surveyor' } });
    const count = await models.User.count({ where: { id: surveyorIds, roleId: role ? role.id : null } });
    if (count !== surveyorIds.length) throw ApiError.badRequest('One or more users are not field surveyors');
  }

  await project.setSurveyors(surveyorIds);
  return listSurveyors(models, projectId);
}

/**
 * Project-level rollups for the dashboard — everything here is derived from
 * real rows (asset/strand/port counts, review status, PostGIS length), never
 * invented. Some things a "stats dashboard" traditionally shows (maintenance
 * due-dates, field-sync status) have no underlying data source yet in this
 * system and are deliberately left out rather than faked.
 */
async function getStats(models, projectId) {
  const project = await getById(models, projectId);

  const assets = await models.NetworkAsset.findAll({
    where: { projectId },
    attributes: ['id', 'geometryType', 'status', 'operationalStatus', 'attributes'],
    include: [{ model: models.Symbology, as: 'symbology', attributes: ['id', 'name', 'isCable', 'isEquipment'] }],
  });

  const byType = new Map();
  let pending = 0;
  let approved = 0;
  let rejected = 0;
  let damaged = 0;
  let maintenance = 0;
  let activeFaults = 0;
  for (const a of assets) {
    const label = a.symbology?.name || a.geometryType;
    byType.set(label, (byType.get(label) || 0) + 1);
    if (a.status === 'pending') pending += 1;
    else if (a.status === 'approved') approved += 1;
    else if (a.status === 'rejected') rejected += 1;
    if (a.operationalStatus === 'maintenance') maintenance += 1;
    const condition = a.attributes?.condition;
    if (condition === 'Damaged' || condition === 'Poor') damaged += 1;
    if (a.attributes?.faultActive) activeFaults += 1;
  }

  const [lengthRow] = await models.sequelize.query(
    `SELECT COALESCE(SUM(ST_Length(geography(na.geom))), 0) AS meters
     FROM network_assets na
     JOIN symbologies s ON s.id = na.symbology_id
     WHERE na.project_id = :projectId AND na.geometry_type = 'LineString' AND s.is_cable = true AND na.deleted_at IS NULL`,
    { replacements: { projectId }, type: models.sequelize.QueryTypes.SELECT }
  );
  const totalOfcLengthFeet = Math.round(Number(lengthRow?.meters || 0) * 3.28084);

  const strands = await models.FiberStrand.findAll({
    attributes: ['id', 'status'],
    include: [{ model: models.NetworkAsset, as: 'cable', attributes: [], where: { projectId }, required: true }],
  });
  const inServiceStrands = strands.filter((s) => s.status === 'in_service').length;

  const ports = await models.EquipmentPort.findAll({
    attributes: ['id', 'status'],
    include: [{ model: models.NetworkAsset, as: 'equipment', attributes: [], where: { projectId }, required: true }],
  });
  const connectedPorts = ports.filter((p) => p.status === 'connected').length;

  const surveyors = await listSurveyors(models, projectId);

  return {
    project: { id: project.id, name: project.name },
    totalAssets: assets.length,
    byType: Array.from(byType.entries()).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
    statusCounts: { pending, approved, rejected },
    surveyProgressPct: assets.length ? Math.round((approved / assets.length) * 100) : 0,
    damagedAssets: damaged,
    assetsInMaintenance: maintenance,
    activeFaults,
    totalOfcLengthFeet,
    strands: { total: strands.length, inService: inServiceStrands, utilizationPct: strands.length ? Math.round((inServiceStrands / strands.length) * 100) : 0 },
    ports: { total: ports.length, connected: connectedPorts },
    activeSurveyors: surveyors.length,
  };
}

module.exports = { list, getById, create, update, remove, listSurveyors, setSurveyors, getStats };
