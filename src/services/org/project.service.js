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
    include: [{ association: 'surveyors', through: { attributes: [] }, attributes: ['id', 'firstName', 'lastName', 'email'] }],
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

module.exports = { list, getById, create, update, remove, listSurveyors, setSurveyors };
