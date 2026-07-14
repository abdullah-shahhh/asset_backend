'use strict';

const moduleService = require('../admin/module.service');
const templateService = require('../admin/surveyTemplate.service');

/** Active survey templates for every module enabled on this organization. */
async function listForOrganization(organizationId) {
  const modules = await moduleService.listForOrganization(organizationId);
  const templates = await Promise.all(
    modules.map(async (module_) => {
      try {
        return await templateService.getActiveForModule(module_.id);
      } catch (err) {
        return null; // module enabled but no active template published yet
      }
    })
  );
  return templates.filter(Boolean);
}

module.exports = { listForOrganization, getActiveForModule: templateService.getActiveForModule };
