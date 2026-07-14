'use strict';

const catchAsync = require('../../utils/catchAsync');
const mediaService = require('../../services/org/media.service');
const response = require('../../helpers/response.helper');
const { fileUrl } = require('../../middleware/upload.middleware');
const ApiError = require('../../utils/ApiError');

const upload = catchAsync(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file uploaded');
  const media = await mediaService.attach(req.db, {
    networkAssetId: req.body.networkAssetId,
    url: fileUrl(req.file),
    mimeType: req.file.mimetype,
    sizeBytes: req.file.size,
    userId: req.user.id,
  });
  return response.created(res, { message: 'Media uploaded', data: media });
});

const listForAsset = catchAsync(async (req, res) => {
  const data = await mediaService.listForAsset(req.db, req.params.networkAssetId);
  return response.success(res, { data });
});

module.exports = { upload, listForAsset };
