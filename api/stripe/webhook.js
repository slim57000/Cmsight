const { getStripe } = require('../../lib/stripe');
const { getSupabaseAdmin } = require('../../lib/supabase');
const { generateLicenseKey, addMonths } = require('../../lib/license');
const { sendLicenseEmail, sendAccessLinkEmail } = require('../../lib/email');
const { findProductByPriceId } = require('../../lib/products');
const { generateAccessToken, hashToken } = require('../../lib/tokens');

const PORTAL_TOKEN_TTL_DAYS = 30;

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }

  const stripe = getStripe();
  const signature = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    const rawBody = await readRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error('stripe webhook: signature verification failed');
    return res.status(400).send('Invalid signature');
  }

  // Only checkout.session.completed is relevant; everything else is
  // acknowledged so Stripe doesn't keep retrying it.
  if (event.type !== 'checkout.session.completed') {
    return res.status(200).json({ received: true });
  }

  const session = event.data.object;

  try {
    if (session.payment_status !== 'paid') {
      console.error('stripe webhook: session not paid, ignoring');
      return res.status(200).json({ received: true });
    }

    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 10 });
    const paidPriceIds = lineItems.data.map((item) => item.price && item.price.id).filter(Boolean);
    // Never trust a client-supplied product name: identify the product from
    // the price Stripe actually charged.
    const product = paidPriceIds.map(findProductByPriceId).find(Boolean);
    if (!product) {
      console.error('stripe webhook: price does not match any known product, ignoring session');
      return res.status(200).json({ received: true });
    }

    const email = (session.customer_details && session.customer_details.email) || session.customer_email;
    if (!email) {
      console.error('stripe webhook: missing customer email, ignoring session');
      return res.status(200).json({ received: true });
    }

    const supabase = getSupabaseAdmin();

    if (product === 'cmsight') {
      // No automatic license for the Cmsight app purchase: record the
      // purchase (idempotent on stripe_session_id) and email a customer
      // portal access link (downloads + updates) instead of a license key.
      const { error: purchaseInsertError } = await supabase.from('purchases').insert({
        email,
        product: 'cmsight',
        stripe_session_id: session.id,
      });

      if (purchaseInsertError && purchaseInsertError.code !== '23505') {
        console.error('stripe webhook: failed to store purchase');
        return res.status(500).json({ error: 'Unable to process' });
      }

      if (purchaseInsertError && purchaseInsertError.code === '23505') {
        // Already processed by a previous delivery of this same event.
        return res.status(200).json({ received: true });
      }

      const rawToken = generateAccessToken();
      const expiresAt = new Date(Date.now() + PORTAL_TOKEN_TTL_DAYS * 86400000);
      const { error: tokenInsertError } = await supabase.from('access_tokens').insert({
        email,
        token_hash: hashToken(rawToken),
        purpose: 'cmsight-downloads',
        expires_at: expiresAt.toISOString(),
      });

      if (tokenInsertError) {
        console.error('stripe webhook: failed to store access token');
        return res.status(500).json({ error: 'Unable to process' });
      }

      const portalUrl = `${process.env.SITE_URL || 'https://cmsight.vercel.app'}/account.html?token=${rawToken}`;
      try {
        await sendAccessLinkEmail({ to: email, url: portalUrl, isNewPurchase: true });
      } catch (emailErr) {
        console.error('stripe webhook: access link email failed to send');
      }

      return res.status(200).json({ received: true });
    }

    // Idempotency guard: skip if this session was already processed
    // (webhook retries, duplicate deliveries).
    const { data: existing } = await supabase
      .from('licenses')
      .select('id')
      .eq('stripe_session_id', session.id)
      .maybeSingle();

    if (existing) {
      return res.status(200).json({ received: true });
    }

    const licenseKey = generateLicenseKey();
    const expiresAt = addMonths(new Date(), 12);

    const { error: insertError } = await supabase.from('licenses').insert({
      license_key: licenseKey,
      email,
      status: 'active',
      expires_at: expiresAt.toISOString(),
      stripe_session_id: session.id,
    });

    if (insertError) {
      // Unique constraint on stripe_session_id: a concurrent retry already
      // inserted this session, which is fine.
      if (insertError.code === '23505') {
        return res.status(200).json({ received: true });
      }
      console.error('stripe webhook: failed to store license');
      return res.status(500).json({ error: 'Unable to process' });
    }

    try {
      await sendLicenseEmail({ to: email, licenseKey, expiresAt });
    } catch (emailErr) {
      console.error('stripe webhook: license email failed to send');
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('stripe webhook: processing failed');
    return res.status(500).json({ error: 'Unable to process' });
  }
}

// Stripe signature verification needs the exact raw request bytes, so the
// default JSON body parsing must be disabled for this route. This must be
// set on the same object exported as the handler, not before it's assigned.
handler.config = { api: { bodyParser: false } };

module.exports = handler;
