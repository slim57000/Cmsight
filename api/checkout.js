const { getStripe } = require('../lib/stripe');
const { getProduct, getPriceId } = require('../lib/products');

const DEFAULT_PRODUCT = 'eu-compliance-suite';

// Creates a Stripe Checkout session for a one-time license purchase
// (EU Compliance Suite or the Cmsight app license). The Stripe secret key
// never leaves this server-side function; the browser only ever receives
// the resulting Checkout URL.
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const requestedProduct = (req.body && req.body.product) || DEFAULT_PRODUCT;
  const product = getProduct(requestedProduct);
  if (!product) {
    return res.status(400).json({ error: 'Unknown product' });
  }

  const priceId = getPriceId(requestedProduct);
  if (!priceId) {
    console.error('checkout: price id not configured for product', requestedProduct);
    return res.status(500).json({ error: 'Checkout is not available right now' });
  }

  try {
    const stripe = getStripe();
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const origin = req.headers.origin || `${proto}://${req.headers.host}`;

    const successBase = process.env.CHECKOUT_SUCCESS_URL || `${origin}${product.defaultSuccessPath}`;
    const cancelBase = process.env.CHECKOUT_CANCEL_URL || `${origin}${product.defaultCancelPath}`;
    const successUrl = `${successBase}${successBase.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}&product=${encodeURIComponent(requestedProduct)}`;
    const cancelUrl = `${cancelBase}${cancelBase.includes('?') ? '&' : '?'}product=${encodeURIComponent(requestedProduct)}`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      // No customer_email is set here, so Stripe Checkout itself collects
      // and verifies the buyer's email address.
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('checkout: failed to create session');
    return res.status(500).json({ error: 'Unable to start checkout' });
  }
};
