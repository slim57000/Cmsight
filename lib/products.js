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

// The Cmsight launch offer ends at LAUNCH_OFFER_END_DATE (ISO date/time).
// Leaving it unset means the offer never ends. Checked live on every
// request rather than via a scheduled job, so no cron is needed.
function isLaunchOfferActive() {
  const endDate = process.env.LAUNCH_OFFER_END_DATE;
  if (!endDate) return true;
  const parsed = new Date(endDate);
  if (Number.isNaN(parsed.getTime())) return true;
  return Date.now() < parsed.getTime();
}

function getLaunchOfferEndDate() {
  return process.env.LAUNCH_OFFER_END_DATE || null;
}

function getPriceId(key) {
  const product = getProduct(key);
  if (!product) return null;

  // Once the launch offer has ended, switch Cmsight checkout to the
  // regular price — but only if that price has actually been configured,
  // so checkout never breaks just because the date passed first.
  if (key === 'cmsight' && !isLaunchOfferActive() && process.env.STRIPE_PRICE_ID_CMSIGHT_REGULAR) {
    return process.env.STRIPE_PRICE_ID_CMSIGHT_REGULAR;
  }

  return process.env[product.priceEnvVar] || null;
}

// Given a Stripe price id actually charged, find which product it belongs
// to. Used by the webhook so it never trusts the client-provided product
// name, only what Stripe itself charged. Matches both the launch price and
// the regular price for Cmsight, so old links / the price switchover don't
// cause paid sessions to be silently ignored.
function findProductByPriceId(priceId) {
  for (const [key, product] of Object.entries(PRODUCTS)) {
    if (process.env[product.priceEnvVar] === priceId) {
      return key;
    }
  }
  if (priceId && priceId === process.env.STRIPE_PRICE_ID_CMSIGHT_REGULAR) {
    return 'cmsight';
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

module.exports = {
  PRODUCTS,
  getProduct,
  getPriceId,
  findProductByPriceId,
  getCmsightDownloads,
  isLaunchOfferActive,
  getLaunchOfferEndDate,
};
