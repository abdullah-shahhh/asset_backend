'use strict';

/**
 * TENANT database — complete initial schema (applied to every organization's
 * own Postgres database by the provisioning pipeline / migrate-tenants script).
 *
 * Tables (in FK-safe order):
 *   permissions, roles, role_permissions, users, refresh_tokens,
 *   projects, network_assets, media_attachments
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "postgis";');

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

    // --- permissions ------------------------------------------------------------
    await queryInterface.createTable('permissions', {
      id: uuidPk,
      key: { type: DataTypes.STRING, allowNull: false, unique: true },
      group: { type: DataTypes.STRING, allowNull: false },
      label: { type: DataTypes.STRING, allowNull: true },
      ...ts,
    });

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

    // --- users (org staff, incl. future surveyors) -----------------------------
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

    // --- projects -------------------------------------------------------------
    await queryInterface.createTable('projects', {
      id: uuidPk,
      name: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      status: {
        type: DataTypes.ENUM('active', 'completed', 'archived'),
        allowNull: false,
        defaultValue: 'active',
      },
      ...ts,
      ...softDelete,
    });

    // --- network_assets ---------------------------------------------------------
    // `geom` is a plain PostGIS geometry column (no subtype/SRID constraint) so
    // a single table can hold both Point and LineString assets.
    await queryInterface.createTable('network_assets', {
      id: uuidPk,
      project_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'projects', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      // References Module.id in the MAIN db — cross-database, validated at the
      // service layer (no DB-level FK possible across separate databases).
      module_id: { type: DataTypes.UUID, allowNull: false },
      asset_type: { type: DataTypes.STRING, allowNull: false },
      geometry_type: { type: DataTypes.STRING, allowNull: false },
      geom: { type: DataTypes.GEOMETRY, allowNull: false },
      attributes: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'pending',
      },
      created_by_user_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      reviewed_by_user_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      reviewed_at: { type: DataTypes.DATE, allowNull: true },
      rejection_reason: { type: DataTypes.STRING, allowNull: true },
      ...ts,
      ...softDelete,
    });
    await queryInterface.addIndex('network_assets', ['project_id']);
    await queryInterface.addIndex('network_assets', ['module_id']);
    await queryInterface.addIndex('network_assets', ['status']);
    await queryInterface.addIndex('network_assets', ['asset_type']);
    await queryInterface.sequelize.query(
      'CREATE INDEX network_assets_geom_gist ON network_assets USING GIST (geom);'
    );

    // --- media_attachments -------------------------------------------------------
    await queryInterface.createTable('media_attachments', {
      id: uuidPk,
      network_asset_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'network_assets', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      url: { type: DataTypes.STRING, allowNull: false },
      mime_type: { type: DataTypes.STRING, allowNull: true },
      size_bytes: { type: DataTypes.INTEGER, allowNull: true },
      uploaded_by_user_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      ...ts,
    });
    await queryInterface.addIndex('media_attachments', ['network_asset_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('media_attachments');
    await queryInterface.dropTable('network_assets');
    await queryInterface.dropTable('projects');
    await queryInterface.dropTable('refresh_tokens');
    await queryInterface.dropTable('users');
    await queryInterface.dropTable('role_permissions');
    await queryInterface.dropTable('roles');
    await queryInterface.dropTable('permissions');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_network_assets_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_projects_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_users_status";');
  },
};
