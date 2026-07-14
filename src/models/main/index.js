'use strict';

const fs = require('fs');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');
const config = require('../../config');
const logger = require('../../config/logger');

const basename = path.basename(__filename);

// Single shared connection to the MAIN (control-plane) database.
const sequelize = new Sequelize(
  config.db.main.database,
  config.db.main.username,
  config.db.main.password,
  {
    host: config.db.main.host,
    port: config.db.main.port,
    dialect: config.db.main.dialect,
    logging: config.db.main.logging ? (msg) => logger.debug(msg) : false,
    pool: config.db.main.pool,
    define: { underscored: true, timestamps: true },
  }
);

const db = {};

// Auto-load every *.model.js file in this directory.
fs.readdirSync(__dirname)
  .filter(
    (file) =>
      file !== basename &&
      file.endsWith('.model.js') &&
      !file.startsWith('.')
  )
  .forEach((file) => {
    const modelFactory = require(path.join(__dirname, file));
    const model = modelFactory(sequelize, DataTypes);
    db[model.name] = model;
  });

// Wire associations.
Object.keys(db).forEach((modelName) => {
  if (typeof db[modelName].associate === 'function') {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
