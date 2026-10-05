const { getStripe } = require('../../lib/stripe');

// Read-only lookup used by the checkout success page to fire an accurate
// Google Ads conversion value: the real amount Stripe charged, instead of
// a hardcoded price guess (which also didn't cover the EU Compliance
// Suite). Only ever returns data for a session that has actually been
// paid, and only to whoever already holds that session_id from their own
// Stripe redirect URL. Deliberately does not return the buyer's email or
// any other PII — this endpoint exists for conversion *value* accuracy
// only.
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sessionId = req.query.session_id;
  if (!sessionId || typeof sessionId !== 'string' || !sessionId.startsWith('cs_')) {
    return res.status(400).json({ error: 'Invalid session_id' });
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') {
      return res.status(404).json({ error: 'Session not paid' });
    }

    return res.status(200).json({
      amountTotal: typeof session.amount_total === 'number' ? session.amount_total / 100 : null,
      currency: session.currency ? session.currency.toUpperCase() : null,
    });
  } catch (err) {
    console.error('checkout/session: failed to retrieve session');
    return res.status(404).json({ error: 'Session not found' });
  }
};
