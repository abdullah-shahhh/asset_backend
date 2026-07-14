'use strict';

const crypto = require('crypto');

/** One-way SHA-256 hash (e.g. for storing refresh-token fingerprints). */
function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

/** Cryptographically random URL-safe token string. */
function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

module.exports = { sha256, randomToken };
