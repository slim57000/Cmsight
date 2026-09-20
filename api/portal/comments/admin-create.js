const { getSupabaseAdmin } = require('../../../lib/supabase');
const { isValidAdminKey } = require('../../../lib/adminAuth');

const MAX_MESSAGE_LENGTH = 1000;
const MAX_NAME_LENGTH = 60;
const DEFAULT_ADMIN_NAME = 'Équipe Cmsight';
const ADMIN_EMAIL_MARKER = 'admin@cmsight.internal';

// Lets the site admin post an official reply into the same customer-visible
// comment feed as account.html. Gated by ADMIN_API_KEY, not a customer
// access token — this is a separate, admin-only credential.
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body || {};

  if (!isValidAdminKey(body.adminKey)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message || message.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ error: 'Invalid message' });
  }

  let name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    name = DEFAULT_ADMIN_NAME;
  } else if (name.length > MAX_NAME_LENGTH) {
    name = name.slice(0, MAX_NAME_LENGTH);
  }

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('comments').insert({
      email: ADMIN_EMAIL_MARKER,
      name,
      message,
      is_admin: true,
    });

    if (error) {
      console.error('portal/comments/admin-create: insert failed');
      return res.status(500).json({ error: 'Unable to process' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('portal/comments/admin-create: unexpected failure');
    return res.status(500).json({ error: 'Unable to process' });
  }
};
