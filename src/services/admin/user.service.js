'use strict';

const { mainDb } = require('../../database');
const { paginate } = require('../../helpers/pagination.helper');
const { USER_STATUS } = require('../../config/constants');
const ApiError = require('../../utils/ApiError');

const { User, Role } = mainDb;

const roleInclude = { association: 'role', attributes: ['id', 'name', 'slug', 'isSuperAdmin'] };

async function list(query) {
  const where = {};
  if (query.status) where.status = query.status;
  if (query.roleId) where.roleId = query.roleId;
  const { rows, pagination } = await paginate(User, query, { where, include: [roleInclude] });
  return { users: rows, pagination };
}

async function getById(id) {
  const user = await User.findByPk(id, { include: [roleInclude] });
  if (!user) throw ApiError.notFound('User not found');
  return user;
}

async function create({ firstName, lastName, email, password, phone, roleId }) {
  if (await User.findOne({ where: { email }, paranoid: false })) {
    throw ApiError.conflict('A user with this email already exists');
  }
  const role = await Role.findByPk(roleId);
  if (!role) throw ApiError.badRequest('Invalid role');

  const user = await User.create({ firstName, lastName, email, password, phone, roleId });
  return getById(user.id);
}

async function update(id, { firstName, lastName, phone, roleId }) {
  const user = await getById(id);
  if (roleId) {
    const role = await Role.findByPk(roleId);
    if (!role) throw ApiError.badRequest('Invalid role');
  }
  await user.update({
    ...(firstName != null && { firstName }),
    ...(lastName !== undefined && { lastName }),
    ...(phone !== undefined && { phone }),
    ...(roleId && { roleId }),
  });
  return getById(id);
}

/** Change status (active / suspended). */
async function setStatus(id, status) {
  const user = await getById(id);
  if (user.role?.isSuperAdmin && status !== USER_STATUS.ACTIVE) {
    throw ApiError.forbidden('A super admin user cannot be suspended');
  }
  await user.update({ status });
  return user;
}

/** Soft delete (status -> deleted, then paranoid destroy). */
async function remove(id) {
  const user = await getById(id);
  if (user.role?.isSuperAdmin) throw ApiError.forbidden('A super admin user cannot be deleted');
  await user.update({ status: USER_STATUS.DELETED });
  await user.destroy();
  return true;
}

module.exports = { list, getById, create, update, setStatus, remove };
