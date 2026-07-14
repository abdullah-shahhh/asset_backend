'use strict';

const catchAsync = require('../../utils/catchAsync');
const templateService = require('../../services/org/surveyTemplate.service');
const response = require('../../helpers/response.helper');

const list = catchAsync(async (req, res) => {
  const data = await templateService.listForOrganization(req.organization.id);
  return response.success(res, { data });
});

module.exports = { list };
