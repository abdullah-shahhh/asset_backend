'use strict';

// ---------------------------------------------------------------------------
// Status enums (status-based, no hard deletes — paranoid soft-delete backs it).
// ---------------------------------------------------------------------------
const ORGANIZATION_STATUS = Object.freeze({
  PENDING: 'pending', // registered, provisioning not yet confirmed
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  DELETED: 'deleted',
});

const USER_STATUS = Object.freeze({
  PENDING: 'pending',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  DELETED: 'deleted',
});

// ---------------------------------------------------------------------------
// Token / auth realm enums.
// ---------------------------------------------------------------------------
const TOKEN_TYPES = Object.freeze({
  ACCESS: 'access',
  REFRESH: 'refresh',
});

// Identifies which "realm" a JWT belongs to so tokens never cross boundaries.
const AUTH_REALM = Object.freeze({
  PLATFORM: 'platform', // superadmin users (main DB)
  ORG: 'org', // organization staff, incl. future mobile surveyors (tenant DB)
});

// ---------------------------------------------------------------------------
// Domain enums.
// ---------------------------------------------------------------------------
const PROJECT_STATUS = Object.freeze({
  ACTIVE: 'active',
  COMPLETED: 'completed',
  ARCHIVED: 'archived',
});

const GEOMETRY_TYPE = Object.freeze({
  POINT: 'Point',
  LINE: 'LineString',
  POLYGON: 'Polygon',
});

const NETWORK_ASSET_STATUS = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
});

// Native equipment health status — independent of NETWORK_ASSET_STATUS above
// (which is the review/approval workflow state). Only meaningful on assets
// whose symbology is flagged is_equipment.
const OPERATIONAL_STATUS = Object.freeze({
  ONLINE: 'online',
  DEGRADED: 'degraded',
  OFFLINE: 'offline',
  MAINTENANCE: 'maintenance',
});

// Salesforce-lite: customer support tickets.
const TICKET_STATUS = Object.freeze({
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
});

const TICKET_PRIORITY = Object.freeze({
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
});

// Fiber strand lifecycle — set manually by a manager, never derived (no OTDR/
// hardware feed exists to infer this automatically, same limitation as
// OPERATIONAL_STATUS above).
const STRAND_STATUS = Object.freeze({
  AVAILABLE: 'available',
  RESERVED: 'reserved',
  IN_SERVICE: 'in_service',
  DARK: 'dark',
  FAULTY: 'faulty',
  UNDER_TEST: 'under_test',
  UNDER_REPAIR: 'under_repair',
  RETIRED: 'retired',
});

// Where in the network a strand sits — optional, manager-assigned.
const STRAND_ROLE = Object.freeze({
  FEEDER: 'feeder',
  DISTRIBUTION: 'distribution',
  DROP: 'drop',
});

// Equipment port occupancy. 'connected' is set automatically when a splice
// references the port (see fiberSplice.service.js), otherwise editable by hand.
const PORT_STATUS = Object.freeze({
  FREE: 'free',
  CONNECTED: 'connected',
});

const AUDIT_ACTIONS = Object.freeze({
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  SUSPEND: 'SUSPEND',
  RESTORE: 'RESTORE',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  PROVISION: 'PROVISION',
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
  MODULE_ENABLE: 'MODULE_ENABLE',
  MODULE_DISABLE: 'MODULE_DISABLE',
  JOIN_CODE_REGENERATE: 'JOIN_CODE_REGENERATE',
});

// ---------------------------------------------------------------------------
// Platform (superadmin, MAIN db) permission catalog.
// `key` is what middleware checks: requirePermission('organizations.create').
// ---------------------------------------------------------------------------
const PERMISSIONS = Object.freeze({
  ORGANIZATIONS_VIEW: 'organizations.view',
  ORGANIZATIONS_CREATE: 'organizations.create',
  ORGANIZATIONS_UPDATE: 'organizations.update',
  ORGANIZATIONS_SUSPEND: 'organizations.suspend',
  ORGANIZATIONS_DELETE: 'organizations.delete',
  // Drill-down (god mode) into an organization's tenant data
  ORGANIZATIONS_VIEW_PROJECTS: 'organizations.view_projects',
  ORGANIZATIONS_VIEW_ASSETS: 'organizations.view_assets',
  ORGANIZATIONS_VIEW_USERS: 'organizations.view_users',
  MODULES_VIEW: 'modules.view',
  MODULES_MANAGE: 'modules.manage', // enable/disable per org, edit survey templates
  ROLES_VIEW: 'roles.view',
  ROLES_CREATE: 'roles.create',
  ROLES_UPDATE: 'roles.update',
  ROLES_DELETE: 'roles.delete',
  USERS_VIEW: 'users.view',
  USERS_CREATE: 'users.create',
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',
  DASHBOARD_VIEW: 'dashboard.view',
  AUDIT_VIEW: 'audit.view',
});

const PERMISSION_CATALOG = Object.freeze(
  Object.values(PERMISSIONS).map((key) => {
    const [group, action] = key.split('.');
    return {
      key,
      group,
      label: `${action.replace(/_/g, ' ')} ${group}`.replace(/\b\w/g, (c) => c.toUpperCase()),
    };
  })
);

// ---------------------------------------------------------------------------
// Organization-side (tenant) permission catalog. Seeded into each tenant DB
// on provisioning. The Org Admin role gets all of these; the Surveyor role
// (reserved for the future mobile app) gets a narrow subset.
// ---------------------------------------------------------------------------
const ORG_PERMISSIONS = Object.freeze({
  PROJECTS_VIEW: 'projects.view',
  PROJECTS_CREATE: 'projects.create',
  PROJECTS_UPDATE: 'projects.update',
  PROJECTS_DELETE: 'projects.delete',
  ASSETS_VIEW: 'assets.view',
  ASSETS_CREATE: 'assets.create',
  ASSETS_UPDATE: 'assets.update',
  ASSETS_DELETE: 'assets.delete',
  ASSETS_APPROVE: 'assets.approve', // approve/reject submissions
  TEMPLATES_VIEW: 'templates.view',
  SYMBOLOGIES_VIEW: 'symbologies.view',
  SYMBOLOGIES_MANAGE: 'symbologies.manage', // create/edit/delete symbologies, assign to projects
  MEDIA_UPLOAD: 'media.upload',
  EXPORT_VIEW: 'export.view',
  USERS_VIEW: 'users.view',
  USERS_CREATE: 'users.create',
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',
  ROLES_VIEW: 'roles.view',
  ROLES_CREATE: 'roles.create',
  ROLES_UPDATE: 'roles.update',
  ROLES_DELETE: 'roles.delete',
  FIELD_TEAM_VIEW: 'field_team.view',
  FIELD_TEAM_MANAGE: 'field_team.manage', // approve/reject/suspend/delete surveyors, regenerate join code
  BRANDING_MANAGE: 'branding.manage',
  CUSTOMERS_VIEW: 'customers.view',
  CUSTOMERS_MANAGE: 'customers.manage',
  TICKETS_VIEW: 'tickets.view',
  TICKETS_MANAGE: 'tickets.manage',
});

const ORG_PERMISSION_CATALOG = Object.freeze(
  Object.values(ORG_PERMISSIONS).map((key) => {
    const [group, action] = key.split('.');
    return {
      key,
      group,
      label: `${action.replace(/_/g, ' ')} ${group}`.replace(/\b\w/g, (c) => c.toUpperCase()),
    };
  })
);

// Permission keys granted to the seeded Surveyor role (reserved for the
// future mobile app — no UI built against it yet in Phase 1).
const SURVEYOR_PERMISSION_KEYS = Object.freeze([
  ORG_PERMISSIONS.PROJECTS_VIEW,
  ORG_PERMISSIONS.ASSETS_VIEW,
  ORG_PERMISSIONS.ASSETS_CREATE,
  ORG_PERMISSIONS.TEMPLATES_VIEW,
  ORG_PERMISSIONS.SYMBOLOGIES_VIEW,
  ORG_PERMISSIONS.MEDIA_UPLOAD,
]);

// ---------------------------------------------------------------------------
// Pagination defaults.
// ---------------------------------------------------------------------------
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 500;

module.exports = {
  ORGANIZATION_STATUS,
  USER_STATUS,
  TOKEN_TYPES,
  AUTH_REALM,
  PROJECT_STATUS,
  GEOMETRY_TYPE,
  NETWORK_ASSET_STATUS,
  OPERATIONAL_STATUS,
  TICKET_STATUS,
  TICKET_PRIORITY,
  STRAND_STATUS,
  STRAND_ROLE,
  PORT_STATUS,
  AUDIT_ACTIONS,
  PERMISSIONS,
  PERMISSION_CATALOG,
  ORG_PERMISSIONS,
  ORG_PERMISSION_CATALOG,
  SURVEYOR_PERMISSION_KEYS,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
};
