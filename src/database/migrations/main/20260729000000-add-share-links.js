'use strict';

/**
 * Temporary, expiring public share links for a project's map — "generate a
 * link, anyone with it can view (read-only) until it expires." Lives in the
 * MAIN db (not tenant) because an anonymous request arrives with nothing but
 * the token — resolving which organization/tenant it belongs to has to work
 * the same way join-code resolution does, before any tenant DB is touched.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;
    await queryInterface.createTable('share_links', {
      id: { type: DataTypes.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      organization_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'organizations', key: 'id' } },
      // The tenant-side Project.id this link is scoped to — cross-database,
      // so validated at the service layer, not a DB foreign key.
      project_id: { type: DataTypes.UUID, allowNull: false },
      token: { type: DataTypes.STRING(64), allowNull: false },
      created_by_user_id: { type: DataTypes.UUID, allowNull: false },
      label: { type: DataTypes.STRING, allowNull: true },
      expires_at: { type: DataTypes.DATE, allowNull: false },
      revoked_at: { type: DataTypes.DATE, allowNull: true },
      last_viewed_at: { type: DataTypes.DATE, allowNull: true },
      view_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('now()') },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('now()') },
    });
    await queryInterface.addConstraint('share_links', {
      fields: ['token'],
      type: 'unique',
      name: 'share_links_token_uk',
    });
    await queryInterface.addIndex('share_links', ['organization_id']);
    await queryInterface.addIndex('share_links', ['project_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('share_links');
  },
};
