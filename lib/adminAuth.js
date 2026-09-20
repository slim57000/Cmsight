// Admin auth is a single shared secret (ADMIN_API_KEY), completely separate
// from the customer magic-link token system. Timing-safe comparison avoids
// leaking the key length/prefix via response-time differences.
const crypto = require('crypto');

function isValidAdminKey(candidate) {
  const expected = process.env.ADMIN_API_KEY;
  if (!expected || typeof candidate !== 'string' || candidate.length === 0) {
    return false;
  }
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

module.exports = { isValidAdminKey };
