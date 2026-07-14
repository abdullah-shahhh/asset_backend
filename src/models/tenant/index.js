'use strict';

const fs = require('fs');
const path = require('path');
const { DataTypes } = require('sequelize');

const basename = path.basename(__filename);

/**
 * Tenant model factories are registered here once and re-applied to EVERY
 * per-organization Sequelize connection the connection manager creates.
 *
 * Each *.model.js file in this folder must export:
 *    (sequelize, DataTypes) => Model
 * and may attach an `associate(models)` method.
 */
const factories = fs
  .readdirSync(__dirname)
  .filter(
    (file) =>
      file !== basename &&
      file.endsWith('.model.js') &&
      !file.startsWith('.')
  )
  .map((file) => require(path.join(__dirname, file)));

/**
 * Initialise all tenant models on a given Sequelize instance.
 * @param {import('sequelize').Sequelize} sequelize
 * @returns {Object} map of modelName -> Model
 */
function initTenantModels(sequelize) {
  const models = {};

  factories.forEach((factory) => {
    const model = factory(sequelize, DataTypes);
    models[model.name] = model;
  });

  Object.keys(models).forEach((name) => {
    if (typeof models[name].associate === 'function') {
      models[name].associate(models);
    }
  });

  models.sequelize = sequelize;

  return models;
}

module.exports = { initTenantModels };
