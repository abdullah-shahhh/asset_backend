'use strict';

const { Sequelize } = require('sequelize');
const config = require('../config');
const logger = require('../config/logger');
const { initTenantModels } = require('../models/tenant');

/**
 * TenantConnectionManager
 * -----------------------
 * Lazily creates and caches one Sequelize connection (with all tenant models
 * initialised) per organization database. Connections are keyed by database
 * name so two organizations never share a pool, and the same organization
 * reuses its pool across requests.
 */
class TenantConnectionManager {
  constructor() {
    /** @type {Map<string, { sequelize: import('sequelize').Sequelize, models: object }>} */
    this.connections = new Map();
  }

  /**
   * Build the physical database name for an organization.
   * @param {{ dbName?: string, slug?: string }} organization
   */
  resolveDbName(organization) {
    if (organization.dbName) return organization.dbName;
    if (organization.slug) return `${config.db.tenant.prefix}${organization.slug}`;
    throw new Error('Cannot resolve tenant database name: organization has no dbName or slug');
  }

  /**
   * Get (or lazily create) the connection + models for an organization.
   * @param {{ id?: string, dbName?: string, slug?: string }} organization
   * @returns {Promise<{ sequelize: import('sequelize').Sequelize, models: object }>}
   */
  async getConnection(organization) {
    const dbName = this.resolveDbName(organization);

    if (this.connections.has(dbName)) {
      return this.connections.get(dbName);
    }

    const sequelize = new Sequelize(dbName, config.db.tenant.username, config.db.tenant.password, {
      host: config.db.tenant.host,
      port: config.db.tenant.port,
      dialect: config.db.tenant.dialect,
      logging: config.db.tenant.logging ? (msg) => logger.debug(msg) : false,
      pool: config.db.tenant.pool,
      define: { underscored: true, timestamps: true },
    });

    const models = initTenantModels(sequelize);
    const entry = { sequelize, models };
    this.connections.set(dbName, entry);

    logger.info(`🔌 Tenant connection initialised for "${dbName}"`);
    return entry;
  }

  /** Verify a tenant connection is reachable (used during provisioning). */
  async authenticate(organization) {
    const { sequelize } = await this.getConnection(organization);
    await sequelize.authenticate();
    return true;
  }

  /** Close and drop a single tenant connection from the cache. */
  async close(dbName) {
    const entry = this.connections.get(dbName);
    if (entry) {
      await entry.sequelize.close();
      this.connections.delete(dbName);
      logger.info(`🔌 Tenant connection closed for "${dbName}"`);
    }
  }

  /** Close all tenant connections (graceful shutdown). */
  async closeAll() {
    await Promise.all(
      [...this.connections.entries()].map(async ([dbName, entry]) => {
        await entry.sequelize.close();
        logger.info(`🔌 Tenant connection closed for "${dbName}"`);
      })
    );
    this.connections.clear();
  }
}

// Singleton across the process.
module.exports = new TenantConnectionManager();
