'use strict';

/**
 * Central audit trail (MAIN db). Records who did what, to which entity,
 * optionally scoped to an organization. `actorRealm` distinguishes a
 * superadmin action from an org-staff action.
 */
module.exports = (sequelize, DataTypes) => {
  const AuditLog = sequelize.define(
    'AuditLog',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      organizationId: { type: DataTypes.UUID, allowNull: true, field: 'organization_id' },
      actorId: { type: DataTypes.UUID, allowNull: true, field: 'actor_id' },
      actorRealm: { type: DataTypes.STRING, allowNull: true, field: 'actor_realm' },
      action: { type: DataTypes.STRING, allowNull: false },
      entity: { type: DataTypes.STRING, allowNull: true },
      entityId: { type: DataTypes.STRING, allowNull: true, field: 'entity_id' },
      metadata: { type: DataTypes.JSONB, allowNull: true },
      ip: { type: DataTypes.STRING, allowNull: true },
      userAgent: { type: DataTypes.STRING, allowNull: true, field: 'user_agent' },
    },
    {
      tableName: 'audit_logs',
      underscored: true,
      timestamps: true,
      updatedAt: false,
      indexes: [
        { fields: ['organization_id'] },
        { fields: ['actor_id'] },
        { fields: ['entity', 'entity_id'] },
      ],
    }
  );

  return AuditLog;
};
