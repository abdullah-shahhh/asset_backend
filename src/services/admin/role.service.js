'use strict';

const { mainDb } = require('../../database');
const { paginate } = require('../../helpers/pagination.helper');
const { PERMISSION_CATALOG } = require('../../config/constants');
const ApiError = require('../../utils/ApiError');

const { Role, Permission, sequelize } = mainDb;

function slugify(str) {
  return String(str).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** List all platform permissions (the catalog), grouped. */
async function listPermissions() {
  const perms = await Permission.findAll({ order: [['group', 'ASC'], ['key', 'ASC']] });
  const source = perms.length ? perms.map((p) => p.toJSON()) : PERMISSION_CATALOG;
  return source.reduce((acc, p) => {
    (acc[p.group] = acc[p.group] || []).push(p);
    return acc;
  }, {});
}

async function list(query) {
  const { rows, pagination } = await paginate(Role, query, {
    include: [{ association: 'permissions', through: { attributes: [] } }],
    distinct: true,
  });
  return { roles: rows, pagination };
}

async function getById(id) {
  const role = await Role.findByPk(id, {
    include: [{ association: 'permissions', through: { attributes: [] } }],
  });
  if (!role) throw ApiError.notFound('Role not found');
  return role;
}

/** Resolve permission keys -> Permission rows (throws on unknown key). */
async function resolvePermissions(keys = []) {
  if (!keys.length) return [];
  const perms = await Permission.findAll({ where: { key: keys } });
  if (perms.length !== new Set(keys).size) {
    const found = new Set(perms.map((p) => p.key));
    const missing = keys.filter((k) => !found.has(k));
    throw ApiError.badRequest(`Unknown permission keys: ${missing.join(', ')}`);
  }
  return perms;
}

async function create({ name, description, permissionKeys = [] }) {
  const slug = slugify(name);
  if (await Role.findOne({ where: { slug }, paranoid: false })) {
    throw ApiError.conflict('A role with this name already exists');
  }
  const perms = await resolvePermissions(permissionKeys);

  return sequelize.transaction(async (transaction) => {
    const role = await Role.create({ name, slug, description }, { transaction });
    if (perms.length) await role.setPermissions(perms, { transaction });
    return getByIdTx(role.id, transaction);
  });
}

async function update(id, { name, description, isActive, permissionKeys }) {
  const role = await getById(id);
  if (role.isSuperAdmin) throw ApiError.forbidden('The Super Admin role cannot be modified');

  return sequelize.transaction(async (transaction) => {
    const patch = {};
    if (name != null) {
      patch.name = name;
      patch.slug = slugify(name);
    }
    if (description !== undefined) patch.description = description;
    if (isActive !== undefined) patch.isActive = isActive;
    await role.update(patch, { transaction });

    if (permissionKeys) {
      const perms = await resolvePermissions(permissionKeys);
      await role.setPermissions(perms, { transaction });
    }
    return getByIdTx(role.id, transaction);
  });
}

async function remove(id) {
  const role = await getById(id);
  if (role.isSystem || role.isSuperAdmin) throw ApiError.forbidden('System roles cannot be deleted');
  const userCount = await mainDb.User.count({ where: { roleId: id } });
  if (userCount) throw ApiError.conflict('Cannot delete a role that is assigned to users');
  await role.destroy();
  return true;
}

function getByIdTx(id, transaction) {
  return Role.findByPk(id, {
    include: [{ association: 'permissions', through: { attributes: [] } }],
    transaction,
  });
}

module.exports = { listPermissions, list, getById, create, update, remove };
