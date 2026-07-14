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

async function create(models, { name, description, status }) {
  return models.Project.create({ name, description, status });
}

async function update(models, id, { name, description, status }) {
  const project = await getById(models, id);
  await project.update({
    ...(name != null && { name }),
    ...(description !== undefined && { description }),
    ...(status != null && { status }),
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

module.exports = { list, getById, create, update, remove };
