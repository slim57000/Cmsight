const { sendContactEmail } = require('../lib/email');

const SUBJECTS = [
  'Demande de démonstration', 'Conditions pour agence', 'Question technique', 'Autre',
  'Demo request', 'Agency terms', 'Technical question', 'Other',
];
const MIN_FILL_MS = 3000;
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 3;
// Best-effort per-instance limiter (serverless instances don't share memory),
// on top of the honeypot, fill-time check and field validation below.
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 500) {
    for (const [k, v] of hits) if (!v.some((t) => now - t < RATE_WINDOW_MS)) hits.delete(k);
  }
  return recent.length > RATE_MAX;
}

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const URL_RE = /^https?:\/\/[^\s/$.?#][^\s]*\.[^\s]{2,}$/i;
// Links in the free-text message are the classic spam signature.
const LINK_RE = /https?:\/\/|www\./gi;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const b = req.body || {};
  const fr = b.lang !== 'en';

  // Honeypot: pretend success so bots don't learn they were filtered.
  if (b.company_url) return res.status(200).json({ ok: true });

  const ip = String((req.headers['x-forwarded-for'] || '').split(',')[0] || req.socket?.remoteAddress || 'unknown').trim();
  if (rateLimited(ip)) {
    return res.status(429).json({ error: fr ? 'Trop de messages envoyés, réessayez dans quelques minutes.' : 'Too many messages, please try again in a few minutes.' });
  }

  const age = Date.now() - Number(b.ts);
  if (!Number.isFinite(age) || age < MIN_FILL_MS || age > MAX_AGE_MS) {
    return res.status(400).json({ error: fr ? 'Formulaire invalide, rechargez la page et réessayez.' : 'Invalid form, please reload the page and try again.' });
  }

  const data = {
    name: str(b.name, 80), email: str(b.email, 120), company: str(b.company, 100),
    website: str(b.website, 200), subject: str(b.subject, 60), message: str(b.message, 2000),
  };
  const invalid =
    data.name.length < 2 || !EMAIL_RE.test(data.email) || data.company.length < 2 ||
    !URL_RE.test(data.website) || !SUBJECTS.includes(data.subject) ||
    data.message.length < 20 || b.consent !== true ||
    (data.message.match(LINK_RE) || []).length > 1;
  if (invalid) {
    return res.status(400).json({ error: fr ? 'Merci de vérifier les champs du formulaire (pas plus d\'un lien dans le message).' : 'Please check the form fields (no more than one link in the message).' });
  }

  try {
    const result = await sendContactEmail(data);
    if (result.skipped) return res.status(503).json({ error: 'Email not configured' });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('contact email failed', err && err.message);
    return res.status(502).json({ error: 'Send failed' });
  }
};
