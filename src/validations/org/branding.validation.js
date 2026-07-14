'use strict';

const { Joi } = require('../../middleware/validate.middleware');

const hexColor = Joi.string().pattern(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);

const update = {
  body: Joi.object({
    primaryColor: hexColor.allow('', null),
    secondaryColor: hexColor.allow('', null),
    textPrimaryColor: hexColor.allow('', null),
    textSecondaryColor: hexColor.allow('', null),
  }).min(1),
};

module.exports = { update };
