'use strict';

const { mainDb } = require('../database');
const logger = require('../config/logger');

/**
 * Write an audit log entry to the MAIN db. Fire-and-forget friendly: never
 * throws, so auditing can't break a request flow.
 *
 * @param {object} params
 * @param {string} params.action       e.g. AUDIT_ACTIONS.CREATE
 * @param {string} [params.entity]
 * @param {string} [params.entityId]
 * @param {string} [params.actorId]
 * @param {string} [params.actorRealm] 'platform' | 'org'
 * @param {string} [params.organizationId]
 * @param {object} [params.metadata]
 * @param {object} [params.req]        Express req (to capture ip/userAgent)
 */
async function record({
  action,
  entity,
  entityId,
  actorId,
  actorRealm,
  organizationId,
  metadata,
  req,
} = {}) {
  try {
    await mainDb.AuditLog.create({
      action,
      entity,
      entityId: entityId != null ? String(entityId) : null,
      actorId: actorId || req?.user?.id || null,
      actorRealm: actorRealm || req?.authRealm || null,
      organizationId: organizationId || req?.user?.organizationId || null,
      metadata: metadata || null,
      ip: req?.ip || null,
      userAgent: req?.headers?.['user-agent'] || null,
    });
  } catch (err) {
    logger.error(`Audit log failed: ${err.message}`);
  }
}

module.exports = { record };
