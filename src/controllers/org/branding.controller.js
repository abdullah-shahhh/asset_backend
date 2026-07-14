'use strict';

const catchAsync = require('../../utils/catchAsync');
const brandingService = require('../../services/org/branding.service');
const response = require('../../helpers/response.helper');
const { fileUrl } = require('../../middleware/upload.middleware');
const ApiError = require('../../utils/ApiError');

const get = catchAsync(async (req, res) => {
  const data = await brandingService.get(req.organization);
  return response.success(res, { data });
});

const update = catchAsync(async (req, res) => {
  const data = await brandingService.update(req.organization, req.body, { req });
  return response.success(res, { message: 'Branding updated', data });
});

const uploadLogo = catchAsync(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file uploaded');
  const data = await brandingService.setLogo(req.organization, fileUrl(req.file));
  return response.success(res, { message: 'Logo uploaded', data });
});

module.exports = { get, update, uploadLogo };
