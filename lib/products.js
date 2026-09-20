// Central registry of sellable products, so checkout and the webhook agree
// on price IDs and behavior without duplicating logic.
const PRODUCTS = {
  'eu-compliance-suite': {
    priceEnvVar: 'STRIPE_PRICE_ID',
    defaultSuccessPath: '/eu-compliance-suite.html',
    defaultCancelPath: '/eu-compliance-suite.html',
    // Automatic license generation + email, handled by the webhook.
    autoLicense: true,
  },
  cmsight: {
    priceEnvVar: 'STRIPE_PRICE_ID_CMSIGHT',
    defaultSuccessPath: '/checkout/success',
    defaultCancelPath: '/index.html',
    // No automatic license: purchase is just confirmed by email.
    autoLicense: false,
  },
};

function getProduct(key) {
  return PRODUCTS[key] || null;
}

function getPriceId(key) {
  const product = getProduct(key);
  if (!product) return null;
  return process.env[product.priceEnvVar] || null;
}

// Given a Stripe price id actually charged, find which product it belongs
// to. Used by the webhook so it never trusts the client-provided product
// name, only what Stripe itself charged.
function findProductByPriceId(priceId) {
  for (const [key, product] of Object.entries(PRODUCTS)) {
    if (process.env[product.priceEnvVar] === priceId) {
      return key;
    }
  }
  return null;
}

// Cmsight downloads are configured via env vars rather than hardcoded here,
// since the installers aren't hosted yet. Returns notReady:true until at
// least one download URL is set.
function getCmsightDownloads() {
  const version = process.env.CMSIGHT_VERSION || null;
  const links = [
    { label: 'Windows', url: process.env.CMSIGHT_DOWNLOAD_URL_WINDOWS || null },
    { label: 'macOS', url: process.env.CMSIGHT_DOWNLOAD_URL_MAC || null },
  ].filter((link) => link.url);

  return { version, links, notReady: links.length === 0 };
}

module.exports = { PRODUCTS, getProduct, getPriceId, findProductByPriceId, getCmsightDownloads };
