const { getSupabaseAdmin } = require('../../../lib/supabase');
const { isValidAdminKey } = require('../../../lib/adminAuth');

const MAX_COMMENTS = 200;

// Admin view of all comments, including the commenter's real email
// (unlike the customer-facing list). Gated by ADMIN_API_KEY.
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isValidAdminKey(req.body && req.body.adminKey)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('comments')
      .select('email, name, message, is_admin, created_at')
      .order('created_at', { ascending: false })
      .limit(MAX_COMMENTS);

    if (error) {
      console.error('portal/comments/admin-list: query failed');
      return res.status(500).json({ error: 'Unable to process' });
    }

    return res.status(200).json({ comments: data || [] });
  } catch (err) {
    console.error('portal/comments/admin-list: unexpected failure');
    return res.status(500).json({ error: 'Unable to process' });
  }
};
