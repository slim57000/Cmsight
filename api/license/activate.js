const { getSupabaseAdmin } = require('../../lib/supabase');
const { isValidLicenseFormat } = require('../../lib/license');

const ALLOWED_PRODUCT = 'eu-compliance-suite';

function normalizeSiteUrl(rawUrl) {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) return null;
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return `${parsed.protocol}//${parsed.host}`.toLowerCase();
  } catch (err) {
    return null;
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const body = req.body || {};
  const { license, site_url: siteUrl, product } = body;

  if (!isValidLicenseFormat(license)) {
    return res.status(400).json({ success: false, error: 'Invalid license' });
  }

  const normalizedSite = normalizeSiteUrl(siteUrl);
  if (!normalizedSite) {
    return res.status(400).json({ success: false, error: 'Invalid site_url' });
  }

  if (product !== undefined && product !== ALLOWED_PRODUCT) {
    return res.status(400).json({ success: false, error: 'Invalid product' });
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data: row, error } = await supabase
      .from('licenses')
      .select('*')
      .eq('license_key', license)
      .maybeSingle();

    if (error) {
      console.error('license/activate: lookup failed');
      return res.status(500).json({ success: false, error: 'Unable to process' });
    }

    if (!row) {
      return res.status(404).json({ success: false, error: 'License not found' });
    }

    if (row.status !== 'active') {
      return res.status(403).json({ success: false, error: 'License is not active' });
    }

    if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
      return res.status(403).json({ success: false, error: 'License has expired' });
    }

    if (row.site_url && row.site_url !== normalizedSite) {
      return res.status(403).json({ success: false, error: 'License already activated on another site' });
    }

    const updates = { last_seen_at: new Date().toISOString() };
    if (!row.site_url) {
      updates.site_url = normalizedSite;
    }

    const { error: updateError } = await supabase
      .from('licenses')
      .update(updates)
      .eq('id', row.id);

    if (updateError) {
      console.error('license/activate: failed to update activation state');
      return res.status(500).json({ success: false, error: 'Unable to process' });
    }

    return res.status(200).json({
      success: true,
      email: row.email,
      expires: row.expires_at ? row.expires_at.slice(0, 10) : null,
    });
  } catch (err) {
    console.error('license/activate: unexpected failure');
    return res.status(500).json({ success: false, error: 'Unable to process' });
  }
};
