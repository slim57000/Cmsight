const { getSupabaseAdmin } = require('./supabase');
const { hashToken } = require('./tokens');

// Resolves a customer-portal access token (from the emailed magic link)
// to the buyer's email, or null if it's missing/unknown/expired. Shared
// by every /api/portal/* route so the validation logic lives in one place.
async function resolveAccessToken(token) {
  if (typeof token !== 'string' || token.length < 32) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const { data: row, error } = await supabase
    .from('access_tokens')
    .select('email, expires_at')
    .eq('token_hash', hashToken(token))
    .eq('purpose', 'cmsight-downloads')
    .maybeSingle();

  if (error || !row || new Date(row.expires_at).getTime() < Date.now()) {
    return null;
  }

  return { email: row.email };
}

module.exports = { resolveAccessToken };
