'use strict';

const { paginate } = require('../../helpers/pagination.helper');
const { ORG_PERMISSION_CATALOG } = require('../../config/constants');
const ApiError = require('../../utils/ApiError');

/**
 * Org (tenant) RBAC — role management. Operates on the request's tenant
 * models (req.db). Mirrors the platform role service but scoped to one org.
 */

function slugify(str) {
  return String(str).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/**
 * Ensure this tenant's `permissions` table is populated with the catalog.
 * Organizations provisioned before the catalog existed (or any missing rows)
 * are back-filled lazily so role create/update never fails on "unknown
 * permission keys". Idempotent.
 */
async function ensurePermissions(models) {
  const existing = await models.Permission.findAll({ attributes: ['key'] });
  const have = new Set(existing.map((p) => p.key));
  const missing = ORG_PERMISSION_CATALOG.filter((p) => !have.has(p.key));
  if (missing.length) {
    await models.Permission.bulkCreate(
      missing.map((p) => ({ key: p.key, group: p.group, label: p.label })),
      { ignoreDuplicates: true }
    );
  }
}

async function listPermissions(models) {
  await ensurePermissions(models);
  return ORG_PERMISSION_CATALOG.reduce((acc, p) => {
    (acc[p.group] = acc[p.group] || []).push(p);
    return acc;
  }, {});
}

async function list(models, query) {
  const { rows, pagination } = await paginate(models.Role, query, {
    include: [{ association: 'permissions', through: { attributes: [] } }],
    distinct: true,
  });
  return { roles: rows, pagination };
}

async function getById(models, id) {
  const role = await models.Role.findByPk(id, {
    include: [{ association: 'permissions', through: { attributes: [] } }],
  });
  if (!role) throw ApiError.notFound('Role not found');
  return role;
}

async function resolvePermissions(models, keys = []) {
  if (!keys.length) return [];
  await ensurePermissions(models);
  const perms = await models.Permission.findAll({ where: { key: keys } });
  if (perms.length !== new Set(keys).size) {
    const found = new Set(perms.map((p) => p.key));
    throw ApiError.badRequest(`Unknown permission keys: ${keys.filter((k) => !found.has(k)).join(', ')}`);
  }
  return perms;
}

async function create(models, { name, description, permissionKeys = [] }) {
  const slug = slugify(name);
  if (await models.Role.findOne({ where: { slug }, paranoid: false })) {
    throw ApiError.conflict('A role with this name already exists');
  }
  const perms = await resolvePermissions(models, permissionKeys);
  return models.sequelize.transaction(async (transaction) => {
    const role = await models.Role.create({ name, slug, description }, { transaction });
    if (perms.length) await role.setPermissions(perms, { transaction });
    return models.Role.findByPk(role.id, {
      include: [{ association: 'permissions', through: { attributes: [] } }],
      transaction,
    });
  });
}

async function update(models, id, { name, description, isActive, permissionKeys }) {
  const role = await getById(models, id);
  if (role.isSuperAdmin) throw ApiError.forbidden('The Org Admin role cannot be modified');

  return models.sequelize.transaction(async (transaction) => {
    const patch = {};
    if (name != null) {
      patch.name = name;
      patch.slug = slugify(name);
    }
    if (description !== undefined) patch.description = description;
    if (isActive !== undefined) patch.isActive = isActive;
    await role.update(patch, { transaction });
    if (permissionKeys) {
      const perms = await resolvePermissions(models, permissionKeys);
      await role.setPermissions(perms, { transaction });
    }
    return models.Role.findByPk(role.id, {
      include: [{ association: 'permissions', through: { attributes: [] } }],
      transaction,
    });
  });
}

async function remove(models, id) {
  const role = await getById(models, id);
  if (role.isSystem || role.isSuperAdmin) throw ApiError.forbidden('System roles cannot be deleted');
  const userCount = await models.User.count({ where: { roleId: id } });
  if (userCount) throw ApiError.conflict('Cannot delete a role assigned to users');
  await role.destroy();
  return true;
}

module.exports = { listPermissions, list, getById, create, update, remove };
