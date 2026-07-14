'use strict';

const { paginate } = require('../../helpers/pagination.helper');
const orgDirectory = require('../shared/org-directory.service');
const { USER_STATUS } = require('../../config/constants');
const ApiError = require('../../utils/ApiError');

/** Org (tenant) staff user management. Operates on req.db. */

const roleInclude = { association: 'role', attributes: ['id', 'name', 'slug', 'isSuperAdmin'] };

async function list(models, query) {
  const where = {};
  if (query.status) where.status = query.status;
  if (query.roleId) where.roleId = query.roleId;
  const { rows, pagination } = await paginate(models.User, query, { where, include: [roleInclude] });
  return { users: rows, pagination };
}

async function getById(models, id) {
  const user = await models.User.findByPk(id, { include: [roleInclude] });
  if (!user) throw ApiError.notFound('User not found');
  return user;
}

async function create(models, organization, { firstName, lastName, email, password, phone, roleId }) {
  const normEmail = orgDirectory.normalize(email);
  // One email = one organization across the whole platform (global directory check).
  if (await orgDirectory.resolveOrganizationId(normEmail)) {
    throw ApiError.conflict('A user with this email already exists');
  }
  if (await models.User.findOne({ where: { email: normEmail }, paranoid: false })) {
    throw ApiError.conflict('A user with this email already exists');
  }
  const role = await models.Role.findByPk(roleId);
  if (!role) throw ApiError.badRequest('Invalid role');

  const user = await models.User.create({ firstName, lastName, email: normEmail, password, phone, roleId });
  try {
    await orgDirectory.register(normEmail, organization.id);
  } catch (err) {
    await user.destroy({ force: true });
    throw err;
  }
  return getById(models, user.id);
}

async function update(models, id, { firstName, lastName, phone, roleId }) {
  const user = await getById(models, id);
  if (roleId) {
    const role = await models.Role.findByPk(roleId);
    if (!role) throw ApiError.badRequest('Invalid role');
  }
  await user.update({
    ...(firstName != null && { firstName }),
    ...(lastName !== undefined && { lastName }),
    ...(phone !== undefined && { phone }),
    ...(roleId && { roleId }),
  });
  return getById(models, id);
}

async function setStatus(models, id, status, currentUserId) {
  const user = await getById(models, id);
  if (user.id === currentUserId) throw ApiError.badRequest('You cannot change your own status');
  if (user.role?.isSuperAdmin && status !== USER_STATUS.ACTIVE) {
    throw ApiError.forbidden('An Org Admin user cannot be suspended');
  }
  await user.update({ status });
  return user;
}

async function remove(models, id, currentUserId) {
  const user = await getById(models, id);
  if (user.id === currentUserId) throw ApiError.badRequest('You cannot delete yourself');
  if (user.role?.isSuperAdmin) throw ApiError.forbidden('An Org Admin user cannot be deleted');
  await user.update({ status: USER_STATUS.DELETED });
  await user.destroy();
  await orgDirectory.remove(user.email);
  return true;
}

module.exports = { list, getById, create, update, setStatus, remove };
