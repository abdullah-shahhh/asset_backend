'use strict';

const { mainDb, connectionManager } = require('../../database');
const { paginate } = require('../../helpers/pagination.helper');
const { uniqueJoinCode } = require('../../helpers/code.helper');
const orgDirectory = require('../shared/org-directory.service');
const auditHelper = require('../../helpers/audit.helper');
const { USER_STATUS, ORGANIZATION_STATUS, AUDIT_ACTIONS, AUTH_REALM } = require('../../config/constants');
const ApiError = require('../../utils/ApiError');

const roleInclude = { association: 'role', attributes: ['id', 'name', 'slug', 'isSuperAdmin'] };

async function getSurveyorRole(models) {
  const role = await models.Role.findOne({ where: { slug: 'surveyor' } });
  if (!role) throw ApiError.internal('Surveyor role missing — organization was not provisioned correctly');
  return role;
}

/** Field team = every tenant user holding the Surveyor role. */
async function list(models, query) {
  const role = await getSurveyorRole(models);
  const where = { roleId: role.id };
  if (query.status) where.status = query.status;
  const { rows, pagination } = await paginate(models.User, query, { where, include: [roleInclude] });
  return { surveyors: rows, pagination };
}

/** Org admin directly adds a surveyor — active immediately, no approval step. */
async function create(models, organization, { firstName, lastName, email, password, phone }) {
  const role = await getSurveyorRole(models);
  const normEmail = orgDirectory.normalize(email);

  if (await orgDirectory.resolveOrganizationId(normEmail)) {
    throw ApiError.conflict('A user with this email already exists');
  }
  if (await models.User.findOne({ where: { email: normEmail }, paranoid: false })) {
    throw ApiError.conflict('A user with this email already exists');
  }

  const user = await models.User.create({
    roleId: role.id,
    firstName,
    lastName: lastName || null,
    email: normEmail,
    password,
    phone: phone || null,
    status: USER_STATUS.ACTIVE,
    isSelfRegistered: false,
  });
  try {
    await orgDirectory.register(normEmail, organization.id);
  } catch (err) {
    await user.destroy({ force: true });
    throw err;
  }
  return models.User.findByPk(user.id, { include: [roleInclude] });
}

/**
 * Public: a field surveyor self-registers with their organization's join
 * code (the future mobile app's signup flow — doc's "APIs for mobile app to
 * be used later"). Account starts PENDING, awaiting org-admin approval.
 */
async function signup({ joinCode, firstName, lastName, email, password, phone }) {
  const organization = await mainDb.Organization.findOne({ where: { joinCode: String(joinCode).toUpperCase() } });
  if (!organization) throw ApiError.badRequest('Invalid join code');
  if (organization.status !== ORGANIZATION_STATUS.ACTIVE) {
    throw ApiError.forbidden('Organization account is not active');
  }

  const normEmail = orgDirectory.normalize(email);
  if (await orgDirectory.resolveOrganizationId(normEmail)) {
    throw ApiError.conflict('A user with this email already exists');
  }

  const { models } = await connectionManager.getConnection(organization);
  const role = await getSurveyorRole(models);

  if (await models.User.findOne({ where: { email: normEmail }, paranoid: false })) {
    throw ApiError.conflict('A user with this email already exists');
  }

  const user = await models.User.create({
    roleId: role.id,
    firstName,
    lastName: lastName || null,
    email: normEmail,
    password,
    phone: phone || null,
    status: USER_STATUS.PENDING,
    isSelfRegistered: true,
  });
  try {
    await orgDirectory.register(normEmail, organization.id);
  } catch (err) {
    await user.destroy({ force: true });
    throw err;
  }

  auditHelper.record({
    action: AUDIT_ACTIONS.CREATE,
    entity: 'User',
    entityId: user.id,
    actorRealm: AUTH_REALM.ORG,
    organizationId: organization.id,
    metadata: { selfRegistered: true },
  });

  return { organizationName: organization.name };
}

async function getById(models, id) {
  const role = await getSurveyorRole(models);
  const user = await models.User.findOne({ where: { id, roleId: role.id }, include: [roleInclude] });
  if (!user) throw ApiError.notFound('Surveyor not found');
  return user;
}

async function approve(models, id, { req } = {}) {
  const user = await getById(models, id);
  if (user.status !== USER_STATUS.PENDING) throw ApiError.badRequest('This surveyor is not awaiting approval');
  await user.update({ status: USER_STATUS.ACTIVE });
  auditHelper.record({ action: AUDIT_ACTIONS.APPROVE, entity: 'User', entityId: id, actorRealm: AUTH_REALM.ORG, req });
  return getById(models, id);
}

/** Reject a pending signup — removes the account and frees the email. */
async function reject(models, id, { req } = {}) {
  const user = await getById(models, id);
  if (user.status !== USER_STATUS.PENDING) throw ApiError.badRequest('This surveyor is not awaiting approval');
  await user.update({ status: USER_STATUS.DELETED });
  await user.destroy();
  await orgDirectory.remove(user.email);
  auditHelper.record({ action: AUDIT_ACTIONS.REJECT, entity: 'User', entityId: id, actorRealm: AUTH_REALM.ORG, req });
  return true;
}

async function setStatus(models, id, status, currentUserId) {
  const user = await getById(models, id);
  if (user.id === currentUserId) throw ApiError.badRequest('You cannot change your own status');
  await user.update({ status });
  return user;
}

async function remove(models, id, currentUserId) {
  const user = await getById(models, id);
  if (user.id === currentUserId) throw ApiError.badRequest('You cannot delete yourself');
  await user.update({ status: USER_STATUS.DELETED });
  await user.destroy();
  await orgDirectory.remove(user.email);
  return true;
}

async function getJoinCode(organization) {
  return { joinCode: organization.joinCode };
}

async function regenerateJoinCode(organization, { req } = {}) {
  const joinCode = await uniqueJoinCode();
  await organization.update({ joinCode });
  auditHelper.record({
    action: AUDIT_ACTIONS.JOIN_CODE_REGENERATE,
    entity: 'Organization',
    entityId: organization.id,
    actorRealm: AUTH_REALM.ORG,
    organizationId: organization.id,
    req,
  });
  return { joinCode };
}

module.exports = { list, create, signup, getById, approve, reject, setStatus, remove, getJoinCode, regenerateJoinCode };
