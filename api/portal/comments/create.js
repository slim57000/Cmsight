const { resolveAccessToken } = require('../../../lib/portalAuth');
const { getSupabaseAdmin } = require('../../../lib/supabase');

const MAX_MESSAGE_LENGTH = 1000;
const MAX_NAME_LENGTH = 60;
const DEFAULT_NAME = 'Client';

// Posts a customer-portal comment. Gated by a valid access token so only
// Cmsight buyers can post. Published immediately, no moderation step, by
// product decision — comments are only ever shown to other authenticated
// buyers (account.html), never on the public marketing site.
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body || {};

  const account = await resolveAccessToken(body.token).catch(() => null);
  if (!account) {
    return res.status(401).json({ error: 'Invalid or expired link' });
  }

  const rawMessage = typeof body.message === 'string' ? body.message.trim() : '';
  if (!rawMessage || rawMessage.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ error: 'Invalid message' });
  }

  let name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    name = DEFAULT_NAME;
  } else if (name.length > MAX_NAME_LENGTH) {
    name = name.slice(0, MAX_NAME_LENGTH);
  }

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('comments').insert({
      email: account.email,
      name,
      message: rawMessage,
    });

    if (error) {
      console.error('portal/comments/create: insert failed');
      return res.status(500).json({ error: 'Unable to process' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('portal/comments/create: unexpected failure');
    return res.status(500).json({ error: 'Unable to process' });
  }
};
