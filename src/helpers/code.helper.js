'use strict';

const { mainDb } = require('../database');

// No 0/O/1/I — avoids transcription mistakes when a code is read aloud or typed.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomCode(len = 7) {
  let out = '';
  for (let i = 0; i < len; i += 1) out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return out;
}

/** Generate a join code guaranteed unique across all organizations. */
async function uniqueJoinCode() {
  let code = randomCode();
  // eslint-disable-next-line no-await-in-loop
  while (await mainDb.Organization.findOne({ where: { joinCode: code }, paranoid: false })) {
    code = randomCode();
  }
  return code;
}

module.exports = { randomCode, uniqueJoinCode };
