const crypto = require('crypto');

const LICENSE_KEY_PATTERN = /^EUC-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/;

function generateLicenseKey() {
  const segment = () => crypto.randomBytes(4).toString('hex').toUpperCase();
  return `EUC-${segment()}-${segment()}-${segment()}`;
}

function isValidLicenseFormat(license) {
  return typeof license === 'string' && LICENSE_KEY_PATTERN.test(license);
}

function addMonths(date, months) {
  const d = new Date(date.getTime());
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

module.exports = { generateLicenseKey, isValidLicenseFormat, addMonths };
