'use strict';

const catchAsync = require('../../utils/catchAsync');
const authService = require('../../services/admin/auth.service');
const response = require('../../helpers/response.helper');

const login = catchAsync(async (req, res) => {
  const result = await authService.login(req.body, { req });
  return response.success(res, { message: 'Login successful', data: result });
});

const refresh = catchAsync(async (req, res) => {
  const result = await authService.refresh(req.body.refreshToken, { req });
  return response.success(res, { message: 'Token refreshed', data: result });
});

const logout = catchAsync(async (req, res) => {
  await authService.logout(req.body.refreshToken, { req });
  return response.success(res, { message: 'Logged out successfully' });
});

const me = catchAsync(async (req, res) => {
  const data = await authService.me(req.user.id);
  return response.success(res, { message: 'Profile fetched', data });
});

module.exports = { login, refresh, logout, me };
