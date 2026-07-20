'use strict';

/**
 * Projects gain a real survey configuration: a type (OFC / Road / Custom),
 * a structured field template asset submissions should collect, and whether
 * photos are required. Also adds project_surveyors — which tenant users
 * (Surveyor role) may submit assets into a given project.
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

    await queryInterface.addColumn('projects', 'survey_type', {
      type: DataTypes.ENUM('ofc_survey', 'road_survey', 'custom'),
      allowNull: false,
      defaultValue: 'custom',
    });
    await queryInterface.addColumn('projects', 'template_fields', {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    });
    await queryInterface.addColumn('projects', 'photos_required', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.createTable('project_surveyors', {
      id: uuidPk,
      project_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'projects', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      ...ts,
    });
    await queryInterface.addConstraint('project_surveyors', {
      fields: ['project_id', 'user_id'],
      type: 'unique',
      name: 'project_surveyors_project_id_user_id_uk',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('project_surveyors');
    await queryInterface.removeColumn('projects', 'photos_required');
    await queryInterface.removeColumn('projects', 'template_fields');
    await queryInterface.removeColumn('projects', 'survey_type');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_projects_survey_type";');
  },
};
