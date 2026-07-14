'use strict';

const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const ApiError = require('../utils/ApiError');

const uploadRoot = path.resolve(config.upload.dir);
if (!fs.existsSync(uploadRoot)) {
  fs.mkdirSync(uploadRoot, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Namespace uploads per organization so tenants never share a folder.
    const sub = req.organization ? path.join(uploadRoot, String(req.organization.id)) : uploadRoot;
    fs.mkdirSync(sub, { recursive: true });
    cb(null, sub);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

/**
 * Build a multer instance with optional mime-type allow-list.
 * @param {object} [opts]
 * @param {string[]} [opts.allowed] allowed mime types
 */
function uploader({ allowed } = {}) {
  return multer({
    storage,
    limits: { fileSize: config.upload.maxSizeBytes },
    fileFilter: (req, file, cb) => {
      if (allowed && !allowed.includes(file.mimetype)) {
        return cb(ApiError.badRequest(`Unsupported file type: ${file.mimetype}`));
      }
      return cb(null, true);
    },
  });
}

// Common presets.
const imageUploader = uploader({ allowed: ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/heic', 'image/heif'] });
const docUploader = uploader({ allowed: ['image/png', 'image/jpeg', 'image/webp', 'application/pdf', 'image/heic', 'image/heif'] });
const anyUploader = uploader();

/** Build the public `/uploads/...` URL for a stored multer file. */
function fileUrl(file) {
  if (!file) return null;
  const rel = path.relative(uploadRoot, file.path).split(path.sep).join('/');
  return `/uploads/${rel}`;
}

module.exports = { uploader, imageUploader, docUploader, anyUploader, uploadRoot, fileUrl };
