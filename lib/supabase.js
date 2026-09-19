const { createClient } = require('@supabase/supabase-js');

let supabaseClient = null;

// Server-side only. Uses the service role key, which bypasses Row Level
// Security, so this must never be imported into browser-facing code.
function getSupabaseAdmin() {
  if (!supabaseClient) {
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not configured');
    }
    supabaseClient = createClient(url, serviceKey, {
      auth: { persistSession: false },
    });
  }
  return supabaseClient;
}

module.exports = { getSupabaseAdmin };
