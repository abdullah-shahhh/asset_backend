'use strict';

const auditHelper = require('../../helpers/audit.helper');
const { AUDIT_ACTIONS, AUTH_REALM } = require('../../config/constants');

const BRANDING_FIELDS = ['logoUrl', 'primaryColor', 'secondaryColor', 'textPrimaryColor', 'textSecondaryColor'];

function toBranding(organization) {
  const out = {};
  BRANDING_FIELDS.forEach((k) => {
    out[k] = organization[k] ?? null;
  });
  return out;
}

async function get(organization) {
  return toBranding(organization);
}

async function update(organization, patch, { req } = {}) {
  const values = {};
  BRANDING_FIELDS.forEach((k) => {
    if (patch[k] !== undefined) values[k] = patch[k];
  });
  await organization.update(values);
  auditHelper.record({
    action: AUDIT_ACTIONS.UPDATE,
    entity: 'OrganizationBranding',
    entityId: organization.id,
    actorRealm: AUTH_REALM.ORG,
    organizationId: organization.id,
    req,
  });
  return toBranding(organization);
}

async function setLogo(organization, logoUrl) {
  await organization.update({ logoUrl });
  return toBranding(organization);
}

module.exports = { get, update, setLogo, BRANDING_FIELDS };
