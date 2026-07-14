'use strict';

const catchAsync = require('../../utils/catchAsync');
const auditLogService = require('../../services/admin/auditLog.service');
const response = require('../../helpers/response.helper');

const list = catchAsync(async (req, res) => {
  const { logs, pagination } = await auditLogService.list(req.query);
  return response.paginated(res, { data: logs, pagination });
});

module.exports = { list };
