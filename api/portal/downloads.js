const { getSupabaseAdmin } = require('../../lib/supabase');
const { hashToken } = require('../../lib/tokens');
const { getCmsightDownloads } = require('../../lib/products');

// Resolves a customer-portal access token (from the emailed magic link)
// into the buyer's download links. The token itself is the credential —
// only its hash is ever stored or compared.
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = req.body && req.body.token;
  if (typeof token !== 'string' || token.length < 32) {
    return res.status(400).json({ error: 'Invalid token' });
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data: row, error } = await supabase
      .from('access_tokens')
      .select('email, expires_at')
      .eq('token_hash', hashToken(token))
      .eq('purpose', 'cmsight-downloads')
      .maybeSingle();

    if (error) {
      console.error('portal/downloads: lookup failed');
      return res.status(500).json({ error: 'Unable to process' });
    }

    if (!row || new Date(row.expires_at).getTime() < Date.now()) {
      return res.status(401).json({ error: 'Invalid or expired link' });
    }

    const downloads = getCmsightDownloads();

    return res.status(200).json({
      email: row.email,
      version: downloads.version,
      links: downloads.links,
      notReady: downloads.notReady,
    });
  } catch (err) {
    console.error('portal/downloads: unexpected failure');
    return res.status(500).json({ error: 'Unable to process' });
  }
};
