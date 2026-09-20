const { resolveAccessToken } = require('../../../lib/portalAuth');
const { getSupabaseAdmin } = require('../../../lib/supabase');

const MAX_COMMENTS = 100;

// Lists customer-portal comments. Gated by a valid access token (i.e. a
// Cmsight buyer) so this stays visible to customers only, not the public
// site. Never returns the commenter's raw email — only their display name.
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

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('comments')
      .select('name, message, created_at')
      .order('created_at', { ascending: false })
      .limit(MAX_COMMENTS);

    if (error) {
      console.error('portal/comments/list: query failed');
      return res.status(500).json({ error: 'Unable to process' });
    }

    return res.status(200).json({ comments: data || [] });
  } catch (err) {
    console.error('portal/comments/list: unexpected failure');
    return res.status(500).json({ error: 'Unable to process' });
  }
};
