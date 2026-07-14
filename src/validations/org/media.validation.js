'use strict';

const { Joi } = require('../../middleware/validate.middleware');

const upload = {
  body: Joi.object({ networkAssetId: Joi.string().uuid().required() }),
};

const listForAsset = {
  params: Joi.object({ networkAssetId: Joi.string().uuid().required() }),
};

module.exports = { upload, listForAsset };
