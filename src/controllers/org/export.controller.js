'use strict';

const catchAsync = require('../../utils/catchAsync');
const exportService = require('../../services/org/export.service');
const response = require('../../helpers/response.helper');

const projectGeoJSON = catchAsync(async (req, res) => {
  const data = await exportService.exportProjectGeoJSON(req.db, req.params.projectId);
  return response.success(res, { data });
});

module.exports = { projectGeoJSON };
