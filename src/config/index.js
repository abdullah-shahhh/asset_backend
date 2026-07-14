'use strict';

const path = require('path');
const dotenv = require('dotenv');
const Joi = require('joi');

// Load .env from project root
dotenv.config({ path: path.join(__dirname, '../../.env') });

const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().default(5000),
  API_PREFIX: Joi.string().default('/api'),
  APP_NAME: Joi.string().default('Urban Asset Management Platform'),
  CLIENT_URL: Joi.string().default('http://localhost:5173'),
  CORS_ORIGINS: Joi.string().allow('').default(''),

  // Main DB
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().allow('').required(),
  DB_NAME: Joi.string().required(),
  DB_DIALECT: Joi.string().default('postgres'),
  DB_LOGGING: Joi.boolean().default(false),
  DB_POOL_MAX: Joi.number().default(10),
  DB_POOL_MIN: Joi.number().default(0),
  DB_POOL_IDLE: Joi.number().default(10000),
  DB_POOL_ACQUIRE: Joi.number().default(30000),

  // Tenant DB
  TENANT_DB_HOST: Joi.string().default(Joi.ref('DB_HOST')),
  TENANT_DB_PORT: Joi.number().default(Joi.ref('DB_PORT')),
  TENANT_DB_USER: Joi.string().default(Joi.ref('DB_USER')),
  TENANT_DB_PASSWORD: Joi.string().allow('').default(Joi.ref('DB_PASSWORD')),
  TENANT_DB_PREFIX: Joi.string().default('uamp_org_'),

  // JWT
  JWT_ACCESS_SECRET: Joi.string().required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('1h'),
  JWT_REFRESH_SECRET: Joi.string().required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // Super-admin bootstrap
  SEED_SUPERADMIN_NAME: Joi.string().default('Super Admin'),
  SEED_SUPERADMIN_EMAIL: Joi.string().email({ tlds: { allow: false } }).default('admin@uamp.local'),
  SEED_SUPERADMIN_PASSWORD: Joi.string().min(8).default('ChangeMe123!'),

  // Demo org bootstrap
  SEED_DEMO_ORG_NAME: Joi.string().default('Demo City Utilities'),
  SEED_DEMO_ORG_SLUG: Joi.string().default('demo-city'),
  SEED_DEMO_ADMIN_EMAIL: Joi.string().email({ tlds: { allow: false } }).default('admin@demo-city.local'),
  SEED_DEMO_ADMIN_PASSWORD: Joi.string().min(8).default('ChangeMe123!'),

  // Uploads
  UPLOAD_DIR: Joi.string().default('src/uploads'),
  MAX_UPLOAD_SIZE_MB: Joi.number().default(15),

  // Rate limit
  RATE_LIMIT_WINDOW_MS: Joi.number().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: Joi.number().default(300),

  // Redis (reserved, optional)
  REDIS_URL: Joi.string().allow('').default(''),
}).unknown(true);

const { value: env, error } = envSchema.validate(process.env, {
  abortEarly: false,
  convert: true,
});

if (error) {
  // eslint-disable-next-line no-console
  console.error('❌ Invalid environment configuration:\n', error.message);
  throw new Error(`Config validation error: ${error.message}`);
}

const config = {
  env: env.NODE_ENV,
  isProd: env.NODE_ENV === 'production',
  isDev: env.NODE_ENV === 'development',
  isTest: env.NODE_ENV === 'test',
  port: env.PORT,
  apiPrefix: env.API_PREFIX,
  appName: env.APP_NAME,
  clientUrl: env.CLIENT_URL,
  corsOrigins: env.CORS_ORIGINS || env.CLIENT_URL,

  db: {
    main: {
      host: env.DB_HOST,
      port: env.DB_PORT,
      username: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
      dialect: env.DB_DIALECT,
      logging: env.DB_LOGGING,
      pool: {
        max: env.DB_POOL_MAX,
        min: env.DB_POOL_MIN,
        idle: env.DB_POOL_IDLE,
        acquire: env.DB_POOL_ACQUIRE,
      },
    },
    tenant: {
      host: env.TENANT_DB_HOST,
      port: env.TENANT_DB_PORT,
      username: env.TENANT_DB_USER,
      password: env.TENANT_DB_PASSWORD,
      dialect: env.DB_DIALECT,
      logging: env.DB_LOGGING,
      prefix: env.TENANT_DB_PREFIX,
      pool: {
        max: env.DB_POOL_MAX,
        min: env.DB_POOL_MIN,
        idle: env.DB_POOL_IDLE,
        acquire: env.DB_POOL_ACQUIRE,
      },
    },
  },

  jwt: {
    access: { secret: env.JWT_ACCESS_SECRET, expiresIn: env.JWT_ACCESS_EXPIRES_IN },
    refresh: { secret: env.JWT_REFRESH_SECRET, expiresIn: env.JWT_REFRESH_EXPIRES_IN },
  },

  seed: {
    superAdmin: {
      name: env.SEED_SUPERADMIN_NAME,
      email: env.SEED_SUPERADMIN_EMAIL,
      password: env.SEED_SUPERADMIN_PASSWORD,
    },
    demoOrg: {
      name: env.SEED_DEMO_ORG_NAME,
      slug: env.SEED_DEMO_ORG_SLUG,
      adminEmail: env.SEED_DEMO_ADMIN_EMAIL,
      adminPassword: env.SEED_DEMO_ADMIN_PASSWORD,
    },
  },

  upload: {
    dir: env.UPLOAD_DIR,
    maxSizeBytes: env.MAX_UPLOAD_SIZE_MB * 1024 * 1024,
  },

  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
  },

  redis: {
    url: env.REDIS_URL,
    enabled: Boolean(env.REDIS_URL),
  },
};

module.exports = config;
