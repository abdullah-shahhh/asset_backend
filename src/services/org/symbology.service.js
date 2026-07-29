'use strict';

const ApiError = require('../../utils/ApiError');

/** Slugify a name into a URL/DB-safe key, e.g. "Fire Hydrant" -> "fire_hydrant". */
function slugify(str) {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/** Ensure a key is unique within the tenant, appending -2, -3, ... on collision. */
async function uniqueKey(models, base, excludeId) {
  let key = base || 'symbology';
  let suffix = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    // eslint-disable-next-line no-await-in-loop
    const clash = await models.Symbology.findOne({ where: { key } });
    if (!clash || clash.id === excludeId) return key;
    key = `${base}_${suffix}`;
    suffix += 1;
  }
}

async function list(models) {
  return models.Symbology.findAll({ order: [['createdAt', 'ASC']] });
}

async function getById(models, id) {
  const symbology = await models.Symbology.findByPk(id);
  if (!symbology) throw ApiError.notFound('Symbology not found');
  return symbology;
}

async function create(models, { name, geometryType, color, icon, isEquipment, isCable, isRfSite, lineWidth, dashArray, fields }) {
  const key = await uniqueKey(models, slugify(name));
  return models.Symbology.create({
    name,
    key,
    geometryType,
    color,
    icon: icon || null,
    isEquipment: !!isEquipment,
    isCable: !!isCable,
    isRfSite: !!isRfSite,
    ...(lineWidth != null && { lineWidth }),
    ...(dashArray !== undefined && { dashArray: dashArray || [] }),
    fields: fields || [],
  });
}

async function update(models, id, { name, color, icon, isEquipment, isCable, isRfSite, lineWidth, dashArray, fields }) {
  const symbology = await getById(models, id);
  await symbology.update({
    ...(name != null && { name }),
    ...(color != null && { color }),
    // Picking a curated icon replaces any custom-uploaded one — the two are
    // mutually exclusive so rendering never has to guess which one "wins".
    ...(icon !== undefined && { icon: icon || null, iconUrl: null }),
    ...(isEquipment != null && { isEquipment }),
    ...(isCable != null && { isCable }),
    ...(isRfSite != null && { isRfSite }),
    ...(lineWidth != null && { lineWidth }),
    ...(dashArray !== undefined && { dashArray: dashArray || [] }),
    ...(fields !== undefined && { fields }),
  });
  return symbology;
}

async function remove(models, id) {
  const symbology = await getById(models, id);
  await symbology.destroy();
  return true;
}

/** Set a custom-uploaded icon image, replacing any curated icon selection. */
async function setIcon(models, id, iconUrl) {
  const symbology = await getById(models, id);
  await symbology.update({ iconUrl, icon: null });
  return symbology;
}

/** Remove a custom-uploaded icon, reverting to no icon (or a re-picked curated one). */
async function removeIcon(models, id) {
  const symbology = await getById(models, id);
  await symbology.update({ iconUrl: null });
  return symbology;
}

/** Symbologies assigned to a project (what the map's drawing tools may offer). */
async function listForProject(models, projectId) {
  const project = await models.Project.findByPk(projectId, {
    include: [{ association: 'symbologies', through: { attributes: [] } }],
  });
  if (!project) throw ApiError.notFound('Project not found');
  return project.symbologies;
}

/** Replace a project's full symbology assignment set. */
async function setForProject(models, projectId, symbologyIds) {
  const project = await models.Project.findByPk(projectId);
  if (!project) throw ApiError.notFound('Project not found');

  if (symbologyIds.length) {
    const count = await models.Symbology.count({ where: { id: symbologyIds } });
    if (count !== symbologyIds.length) throw ApiError.badRequest('One or more symbologies were not found');
  }

  await project.setSymbologies(symbologyIds);
  return listForProject(models, projectId);
}

module.exports = { list, getById, create, update, remove, setIcon, removeIcon, listForProject, setForProject };
