const { getSupabaseAdmin } = require('../../lib/supabase');
const { sendAccessLinkEmail } = require('../../lib/email');
const { generateAccessToken, hashToken } = require('../../lib/tokens');

const PORTAL_TOKEN_TTL_DAYS = 30;
const GENERIC_MESSAGE = "Si un achat existe pour cet email, un lien d'accès vient de vous être envoyé.";

function isValidEmail(email) {
  return typeof email === 'string' && email.length < 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Lets a Cmsight buyer get a fresh access link to the customer portal
// without needing an account/password. Always responds with the same
// generic message regardless of whether the email matches a purchase, so
// this can't be used to find out which emails have bought the product.
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawEmail = req.body && req.body.email;
  if (!isValidEmail(rawEmail)) {
    return res.status(400).json({ error: 'Invalid email' });
  }
  const email = rawEmail.trim().toLowerCase();

  try {
    const supabase = getSupabaseAdmin();

    const { data: purchase } = await supabase
      .from('purchases')
      .select('id')
      .eq('email', email)
      .eq('product', 'cmsight')
      .maybeSingle();

    if (purchase) {
      const rawToken = generateAccessToken();
      const expiresAt = new Date(Date.now() + PORTAL_TOKEN_TTL_DAYS * 86400000);

      const { error: tokenInsertError } = await supabase.from('access_tokens').insert({
        email,
        token_hash: hashToken(rawToken),
        purpose: 'cmsight-downloads',
        expires_at: expiresAt.toISOString(),
      });

      if (!tokenInsertError) {
        const portalUrl = `${process.env.SITE_URL || 'https://cmsight.vercel.app'}/account.html?token=${rawToken}`;
        try {
          await sendAccessLinkEmail({ to: email, url: portalUrl, isNewPurchase: false });
        } catch (emailErr) {
          console.error('portal/request-link: access link email failed to send');
        }
      } else {
        console.error('portal/request-link: failed to store access token');
      }
    }

    return res.status(200).json({ message: GENERIC_MESSAGE });
  } catch (err) {
    // A genuine infra failure here is independent of which email was
    // submitted, so returning a distinct error doesn't leak whether that
    // email has a purchase — only the "found vs not found" branch above
    // needs to stay indistinguishable, and it always returns the same
    // 200 + generic message.
    console.error('portal/request-link: unexpected failure');
    return res.status(500).json({ error: 'Unable to process' });
  }
};
