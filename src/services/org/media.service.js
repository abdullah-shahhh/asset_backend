'use strict';

const ApiError = require('../../utils/ApiError');

/** Attach an already-uploaded file (via multer) to a NetworkAsset as media. */
async function attach(models, { networkAssetId, url, mimeType, sizeBytes, userId }) {
  const asset = await models.NetworkAsset.findByPk(networkAssetId);
  if (!asset) throw ApiError.notFound('Network asset not found');

  return models.MediaAttachment.create({
    networkAssetId,
    url,
    mimeType,
    sizeBytes,
    uploadedByUserId: userId,
  });
}

async function listForAsset(models, networkAssetId) {
  return models.MediaAttachment.findAll({ where: { networkAssetId }, order: [['createdAt', 'DESC']] });
}

module.exports = { attach, listForAsset };
