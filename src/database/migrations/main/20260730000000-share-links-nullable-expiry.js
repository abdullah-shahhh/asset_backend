'use strict';

/** Allows a share link to have no expiry at all ("forever, until I revoke
 * it") — null expires_at means never-expires rather than a magic far-future
 * date. */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('share_links', 'expires_at', {
      type: Sequelize.DataTypes.DATE,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      `UPDATE share_links SET expires_at = now() + interval '100 years' WHERE expires_at IS NULL`
    );
    await queryInterface.changeColumn('share_links', 'expires_at', {
      type: Sequelize.DataTypes.DATE,
      allowNull: false,
    });
  },
};
