'use strict';

const catchAsync = require('../../utils/catchAsync');
const fieldTeamService = require('../../services/org/fieldTeam.service');
const response = require('../../helpers/response.helper');

const list = catchAsync(async (req, res) => {
  const { surveyors, pagination } = await fieldTeamService.list(req.db, req.query);
  return response.paginated(res, { data: surveyors, pagination });
});

const create = catchAsync(async (req, res) => {
  const surveyor = await fieldTeamService.create(req.db, req.organization, req.body);
  return response.created(res, { message: 'Surveyor added', data: surveyor });
});

// Public — the future mobile app's signup screen.
const signup = catchAsync(async (req, res) => {
  const data = await fieldTeamService.signup(req.body);
  return response.created(res, {
    message: `Signed up for ${data.organizationName}. An organization admin needs to approve your account before you can log in.`,
    data,
  });
});

const approve = catchAsync(async (req, res) => {
  const surveyor = await fieldTeamService.approve(req.db, req.params.id, { req });
  return response.success(res, { message: 'Surveyor approved', data: surveyor });
});

const reject = catchAsync(async (req, res) => {
  await fieldTeamService.reject(req.db, req.params.id, { req });
  return response.success(res, { message: 'Signup rejected' });
});

const setStatus = catchAsync(async (req, res) => {
  const surveyor = await fieldTeamService.setStatus(req.db, req.params.id, req.body.status, req.user.id);
  return response.success(res, { message: 'Status updated', data: surveyor });
});

const remove = catchAsync(async (req, res) => {
  await fieldTeamService.remove(req.db, req.params.id, req.user.id);
  return response.success(res, { message: 'Surveyor removed' });
});

const getJoinCode = catchAsync(async (req, res) => {
  const data = await fieldTeamService.getJoinCode(req.organization);
  return response.success(res, { data });
});

const regenerateJoinCode = catchAsync(async (req, res) => {
  const data = await fieldTeamService.regenerateJoinCode(req.organization, { req });
  return response.success(res, { message: 'Join code regenerated', data });
});

module.exports = { list, create, signup, approve, reject, setStatus, remove, getJoinCode, regenerateJoinCode };
