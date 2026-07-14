'use strict';

const ApiError = require('../utils/ApiError');

/**
 * Guard a route by permission key(s). Super-admin roles (platform or org)
 * bypass all checks.
 *
 * Usage:
 *   requirePermission(PERMISSIONS.ORGANIZATIONS_CREATE)
 *   requirePermission(ORG_PERMISSIONS.PROJECTS_VIEW, ORG_PERMISSIONS.PROJECTS_UPDATE)  // ANY of
 *
 * Must run after authenticatePlatform/authenticateOrg (which set
 * req.permissions + req.isSuperAdmin).
 */
const requirePermission =
  (...required) =>
  (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (req.isSuperAdmin) return next();

    const perms = req.permissions || new Set();
    const ok = required.some((key) => perms.has(key));
    if (!ok) {
      return next(ApiError.forbidden(`Missing required permission: ${required.join(' | ')}`));
    }
    return next();
  };

/** Require ALL listed permissions (rare, but available). */
const requireAllPermissions =
  (...required) =>
  (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (req.isSuperAdmin) return next();

    const perms = req.permissions || new Set();
    const missing = required.filter((key) => !perms.has(key));
    if (missing.length) {
      return next(ApiError.forbidden(`Missing required permission(s): ${missing.join(', ')}`));
    }
    return next();
  };

module.exports = { requirePermission, requireAllPermissions };
