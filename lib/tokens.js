const crypto = require('crypto');

// Raw token goes only in the emailed link; we store its hash so a database
// leak alone can't be replayed as a valid access token.
function generateAccessToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken, 'utf8').digest('hex');
}

module.exports = { generateAccessToken, hashToken };
