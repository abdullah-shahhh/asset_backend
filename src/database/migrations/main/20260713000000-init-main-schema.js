'use strict';

/**
 * MAIN database — complete initial schema.
 *
 * Tables (in FK-safe order):
 *   modules, permissions, organizations, roles, role_permissions, users,
 *   survey_templates, organization_modules, org_user_directory,
 *   refresh_tokens, audit_logs
 *
 * Run with:              npm run migrate:main
 * Rollback with:         npm run migrate:main:undo:all
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

    const uuidPk = {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
    };
    const ts = {
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    };
    const softDelete = { deleted_at: { type: DataTypes.DATE, allowNull: true } };

    // --- modules --------------------------------------------------------------
    await queryInterface.createTable('modules', {
      id: uuidPk,
      key: { type: DataTypes.STRING, allowNull: false, unique: true },
      name: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      ...ts,
    });

    // --- permissions ------------------------------------------------------------
    await queryInterface.createTable('permissions', {
      id: uuidPk,
      key: { type: DataTypes.STRING, allowNull: false, unique: true },
      group: { type: DataTypes.STRING, allowNull: false },
      label: { type: DataTypes.STRING, allowNull: true },
      ...ts,
    });

    // --- organizations ------------------------------------------------------------
    await queryInterface.createTable('organizations', {
      id: uuidPk,
      name: { type: DataTypes.STRING, allowNull: false },
      slug: { type: DataTypes.STRING, allowNull: false, unique: true },
      db_name: { type: DataTypes.STRING, allowNull: false, unique: true },
      email: { type: DataTypes.STRING, allowNull: true },
      contact_name: { type: DataTypes.STRING, allowNull: true },
      contact_phone: { type: DataTypes.STRING, allowNull: true },
      address: { type: DataTypes.TEXT, allowNull: true },
      country: { type: DataTypes.STRING, allowNull: true },
      timezone: { type: DataTypes.STRING, allowNull: false, defaultValue: 'UTC' },
      status: {
        type: DataTypes.ENUM('pending', 'active', 'suspended', 'deleted'),
        allowNull: false,
        defaultValue: 'pending',
      },
      is_provisioned: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      suspended_at: { type: DataTypes.DATE, allowNull: true },
      suspend_reason: { type: DataTypes.STRING, allowNull: true },
      metadata: { type: DataTypes.JSONB, allowNull: true },
      ...ts,
      ...softDelete,
    });
    await queryInterface.addIndex('organizations', ['status']);

    // --- roles --------------------------------------------------------------
    await queryInterface.createTable('roles', {
      id: uuidPk,
      name: { type: DataTypes.STRING, allowNull: false },
      slug: { type: DataTypes.STRING, allowNull: false, unique: true },
      description: { type: DataTypes.STRING, allowNull: true },
      is_system: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      is_super_admin: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      ...ts,
      ...softDelete,
    });

    // --- role_permissions -----------------------------------------------------
    await queryInterface.createTable('role_permissions', {
      id: uuidPk,
      role_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'roles', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      permission_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'permissions', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      ...ts,
    });
    await queryInterface.addConstraint('role_permissions', {
      fields: ['role_id', 'permission_id'],
      type: 'unique',
      name: 'role_permissions_role_id_permission_id_uk',
    });

    // --- users (platform staff) -------------------------------------------------
    await queryInterface.createTable('users', {
      id: uuidPk,
      role_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'roles', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      first_name: { type: DataTypes.STRING, allowNull: false },
      last_name: { type: DataTypes.STRING, allowNull: true },
      email: { type: DataTypes.STRING, allowNull: false, unique: true },
      password: { type: DataTypes.STRING, allowNull: false },
      phone: { type: DataTypes.STRING, allowNull: true },
      status: {
        type: DataTypes.ENUM('pending', 'active', 'suspended', 'deleted'),
        allowNull: false,
        defaultValue: 'active',
      },
      last_login_at: { type: DataTypes.DATE, allowNull: true },
      ...ts,
      ...softDelete,
    });

    // --- survey_templates -----------------------------------------------------
    await queryInterface.createTable('survey_templates', {
      id: uuidPk,
      module_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'modules', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      name: { type: DataTypes.STRING, allowNull: false },
      version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      schema_json: { type: DataTypes.JSONB, allowNull: false },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      ...ts,
    });
    await queryInterface.addIndex('survey_templates', ['module_id']);

    // --- organization_modules -------------------------------------------------
    await queryInterface.createTable('organization_modules', {
      id: uuidPk,
      organization_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'organizations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      module_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'modules', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      enabled_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      ...ts,
    });
    await queryInterface.addConstraint('organization_modules', {
      fields: ['organization_id', 'module_id'],
      type: 'unique',
      name: 'organization_modules_org_module_uk',
    });

    // --- org_user_directory -----------------------------------------------------
    await queryInterface.createTable('org_user_directory', {
      id: uuidPk,
      email: { type: DataTypes.STRING, allowNull: false, unique: true },
      organization_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'organizations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      ...ts,
    });
    await queryInterface.addIndex('org_user_directory', ['organization_id']);

    // --- refresh_tokens ---------------------------------------------------------
    await queryInterface.createTable('refresh_tokens', {
      id: uuidPk,
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      token_hash: { type: DataTypes.STRING, allowNull: false },
      expires_at: { type: DataTypes.DATE, allowNull: false },
      revoked_at: { type: DataTypes.DATE, allowNull: true },
      user_agent: { type: DataTypes.STRING, allowNull: true },
      ip: { type: DataTypes.STRING, allowNull: true },
      ...ts,
    });
    await queryInterface.addIndex('refresh_tokens', ['token_hash']);
    await queryInterface.addIndex('refresh_tokens', ['user_id']);

    // --- audit_logs ---------------------------------------------------------
    await queryInterface.createTable('audit_logs', {
      id: uuidPk,
      organization_id: { type: DataTypes.UUID, allowNull: true },
      actor_id: { type: DataTypes.UUID, allowNull: true },
      actor_realm: { type: DataTypes.STRING, allowNull: true },
      action: { type: DataTypes.STRING, allowNull: false },
      entity: { type: DataTypes.STRING, allowNull: true },
      entity_id: { type: DataTypes.STRING, allowNull: true },
      metadata: { type: DataTypes.JSONB, allowNull: true },
      ip: { type: DataTypes.STRING, allowNull: true },
      user_agent: { type: DataTypes.STRING, allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('audit_logs', ['organization_id']);
    await queryInterface.addIndex('audit_logs', ['actor_id']);
    await queryInterface.addIndex('audit_logs', ['entity', 'entity_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('audit_logs');
    await queryInterface.dropTable('refresh_tokens');
    await queryInterface.dropTable('org_user_directory');
    await queryInterface.dropTable('organization_modules');
    await queryInterface.dropTable('survey_templates');
    await queryInterface.dropTable('users');
    await queryInterface.dropTable('role_permissions');
    await queryInterface.dropTable('roles');
    await queryInterface.dropTable('organizations');
    await queryInterface.dropTable('permissions');
    await queryInterface.dropTable('modules');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_organizations_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_users_status";');
  },
};
