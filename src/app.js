'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const config = require('./config');
const logger = require('./config/logger');
const routes = require('./routes');
const { apiLimiter } = require('./middleware/rateLimiter.middleware');
const { notFound, errorHandler } = require('./middleware/error.middleware');

const app = express();

// Trust the first proxy (needed for correct req.ip behind nginx / load balancers).
app.set('trust proxy', 1);

// `crossOriginResourcePolicy: cross-origin` lets the separate frontend origins
// (client-panel, superadmin-panel) embed media served from /uploads. Without
// it Helmet's default `same-origin` policy blocks every <img> loaded from
// this API (asset photos, org logos, etc.).
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(
  cors({
    origin: config.corsOrigins === '*' ? true : config.corsOrigins.split(',').map((s) => s.trim()),
    credentials: true,
  })
);
app.use(compression());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Request logging via winston stream.
app.use(morgan(config.isDev ? 'dev' : 'combined', { stream: logger.stream }));

// Serve uploaded files statically (survey photos, sketches).
app.use('/uploads', express.static(config.upload.dir));

// Rate limiting on the API surface.
app.use(config.apiPrefix, apiLimiter);

// Mount API routes.
app.use(config.apiPrefix, routes);

// Root.
app.get('/', (req, res) => {
  res.json({ success: true, message: `${config.appName} API`, version: 'v1' });
});

// 404 + centralized error handler (must be last).
app.use(notFound);
app.use(errorHandler);

module.exports = app;
