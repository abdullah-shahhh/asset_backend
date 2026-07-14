'use strict';

/**
 * Adds:
 *   - organizations.join_code — short human-shareable code for surveyor
 *     self-registration (doc mobile-readiness: "send a company code so
 *     field staff can be added").
 *   - organizations.{logo_url, primary_color, secondary_color,
 *     text_primary_color, text_secondary_color} — client panel branding.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;

    await queryInterface.addColumn('organizations', 'join_code', {
      type: DataTypes.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('organizations', 'logo_url', { type: DataTypes.STRING, allowNull: true });
    await queryInterface.addColumn('organizations', 'primary_color', { type: DataTypes.STRING, allowNull: true });
    await queryInterface.addColumn('organizations', 'secondary_color', { type: DataTypes.STRING, allowNull: true });
    await queryInterface.addColumn('organizations', 'text_primary_color', { type: DataTypes.STRING, allowNull: true });
    await queryInterface.addColumn('organizations', 'text_secondary_color', { type: DataTypes.STRING, allowNull: true });

    // Backfill any pre-existing rows with a random code before enforcing NOT NULL.
    await queryInterface.sequelize.query(
      `UPDATE organizations SET join_code = upper(substr(md5(random()::text || id::text), 1, 8)) WHERE join_code IS NULL`
    );

    await queryInterface.changeColumn('organizations', 'join_code', {
      type: DataTypes.STRING,
      allowNull: false,
    });
    await queryInterface.addConstraint('organizations', {
      fields: ['join_code'],
      type: 'unique',
      name: 'organizations_join_code_uk',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint('organizations', 'organizations_join_code_uk');
    await queryInterface.removeColumn('organizations', 'join_code');
    await queryInterface.removeColumn('organizations', 'logo_url');
    await queryInterface.removeColumn('organizations', 'primary_color');
    await queryInterface.removeColumn('organizations', 'secondary_color');
    await queryInterface.removeColumn('organizations', 'text_primary_color');
    await queryInterface.removeColumn('organizations', 'text_secondary_color');
  },
};
