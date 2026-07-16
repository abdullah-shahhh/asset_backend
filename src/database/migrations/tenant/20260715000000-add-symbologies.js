'use strict';

/**
 * Manager-defined symbologies — named point/line/polygon drawing tools with a
 * color, assignable per-project so field surveys can only draw with whatever
 * symbologies their active project has been given (doc: "dynamic symbology").
 *
 * Also loosens network_assets.module_id (no longer required once an asset is
 * created from a symbology instead of a module survey-template asset type)
 * and adds network_assets.symbology_id.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;

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

    // --- symbologies ------------------------------------------------------------
    await queryInterface.createTable('symbologies', {
      id: uuidPk,
      name: { type: DataTypes.STRING, allowNull: false },
      key: { type: DataTypes.STRING, allowNull: false, unique: true },
      geometry_type: { type: DataTypes.ENUM('Point', 'LineString', 'Polygon'), allowNull: false },
      color: { type: DataTypes.STRING, allowNull: false, defaultValue: '#2f4fb4' },
      ...ts,
    });

    // --- project_symbologies (assignment) ----------------------------------------
    await queryInterface.createTable('project_symbologies', {
      id: uuidPk,
      project_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'projects', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      symbology_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'symbologies', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      ...ts,
    });
    await queryInterface.addConstraint('project_symbologies', {
      fields: ['project_id', 'symbology_id'],
      type: 'unique',
      name: 'project_symbologies_project_id_symbology_id_uk',
    });

    // --- network_assets: symbology-driven creation ----------------------------
    await queryInterface.addColumn('network_assets', 'symbology_id', {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'symbologies', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
    await queryInterface.addIndex('network_assets', ['symbology_id']);
    // Assets are now created against a symbology (which already carries its
    // own geometry type); the module/survey-template asset type is legacy.
    await queryInterface.changeColumn('network_assets', 'module_id', {
      type: DataTypes.UUID,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;
    await queryInterface.changeColumn('network_assets', 'module_id', {
      type: DataTypes.UUID,
      allowNull: false,
    });
    await queryInterface.removeIndex('network_assets', ['symbology_id']);
    await queryInterface.removeColumn('network_assets', 'symbology_id');
    await queryInterface.dropTable('project_symbologies');
    await queryInterface.dropTable('symbologies');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_symbologies_geometry_type";');
  },
};
