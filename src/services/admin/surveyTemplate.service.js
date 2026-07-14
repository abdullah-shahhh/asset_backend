'use strict';

const { mainDb } = require('../../database');
const ApiError = require('../../utils/ApiError');

const { SurveyTemplate, Module } = mainDb;

async function list(query = {}) {
  const where = {};
  if (query.moduleId) where.moduleId = query.moduleId;
  return SurveyTemplate.findAll({ where, include: [{ association: 'module' }], order: [['createdAt', 'DESC']] });
}

async function getById(id) {
  const template = await SurveyTemplate.findByPk(id, { include: [{ association: 'module' }] });
  if (!template) throw ApiError.notFound('Survey template not found');
  return template;
}

/** Active template for a module — what org clients (web + future mobile) read live. */
async function getActiveForModule(moduleId) {
  const template = await SurveyTemplate.findOne({ where: { moduleId, isActive: true }, order: [['version', 'DESC']] });
  if (!template) throw ApiError.notFound('No active survey template for this module');
  return template;
}

async function create({ moduleId, name, schemaJson }) {
  const module_ = await Module.findByPk(moduleId);
  if (!module_) throw ApiError.badRequest('Invalid module');
  return SurveyTemplate.create({ moduleId, name, schemaJson, version: 1, isActive: true });
}

async function update(id, { name, schemaJson, isActive }) {
  const template = await getById(id);
  const patch = {};
  if (name != null) patch.name = name;
  if (schemaJson != null) {
    patch.schemaJson = schemaJson;
    patch.version = template.version + 1;
  }
  if (isActive !== undefined) patch.isActive = isActive;
  await template.update(patch);
  return getById(id);
}

module.exports = { list, getById, getActiveForModule, create, update };
