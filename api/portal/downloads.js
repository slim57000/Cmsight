const { resolveAccessToken } = require('../../lib/portalAuth');
const { getCmsightDownloads } = require('../../lib/products');

// Resolves a customer-portal access token (from the emailed magic link)
// into the buyer's download links. The token itself is the credential —
// only its hash is ever stored or compared.
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const account = await resolveAccessToken(req.body && req.body.token);
    if (!account) {
      return res.status(401).json({ error: 'Invalid or expired link' });
    }

    const downloads = getCmsightDownloads();

    return res.status(200).json({
      email: account.email,
      version: downloads.version,
      links: downloads.links,
      notReady: downloads.notReady,
    });
  } catch (err) {
    console.error('portal/downloads: unexpected failure');
    return res.status(500).json({ error: 'Unable to process' });
  }
};
