'use strict';

/**
 * projects.survey_type stops being a fixed ENUM('ofc_survey', 'road_survey',
 * 'custom') — organizations kept asking to name their own survey types
 * instead of picking from two presets, so it becomes a plain freeform label
 * (still just a string in the DB, no lookup table). Existing rows are
 * relabeled from their old slugs to the display text the app already showed
 * for them, so nothing appears to change for existing projects.
 */
module.exports = {
  async up(queryInterface) {
    const sequelize = queryInterface.sequelize;
    await sequelize.query('ALTER TABLE projects ALTER COLUMN survey_type TYPE TEXT USING survey_type::text;');
    await sequelize.query(`
      UPDATE projects SET survey_type = CASE survey_type
        WHEN 'ofc_survey' THEN 'OFC Survey'
        WHEN 'road_survey' THEN 'Road Survey'
        WHEN 'custom' THEN 'Custom'
        ELSE survey_type
      END;
    `);
    await sequelize.query('ALTER TABLE projects ALTER COLUMN survey_type TYPE VARCHAR(100);');
    await sequelize.query("ALTER TABLE projects ALTER COLUMN survey_type SET DEFAULT 'Custom';");
    await sequelize.query('DROP TYPE IF EXISTS "enum_projects_survey_type";');
  },

  async down(queryInterface) {
    const sequelize = queryInterface.sequelize;
    await sequelize.query(`
      UPDATE projects SET survey_type = CASE survey_type
        WHEN 'OFC Survey' THEN 'ofc_survey'
        WHEN 'Road Survey' THEN 'road_survey'
        ELSE 'custom'
      END;
    `);
    await sequelize.query("CREATE TYPE \"enum_projects_survey_type\" AS ENUM ('ofc_survey', 'road_survey', 'custom');");
    await sequelize.query('ALTER TABLE projects ALTER COLUMN survey_type DROP DEFAULT;');
    await sequelize.query(
      'ALTER TABLE projects ALTER COLUMN survey_type TYPE "enum_projects_survey_type" USING survey_type::"enum_projects_survey_type";'
    );
    await sequelize.query("ALTER TABLE projects ALTER COLUMN survey_type SET DEFAULT 'custom';");
  },
};
