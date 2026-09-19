# EU Compliance Suite — deployment notes

The site itself is still fully static (index.html, en.html, style.css,
script.js) and deploys unchanged. This adds a licensing/payment backend
as Vercel Serverless Functions under `/api`, backed by Supabase and
Stripe. None of this runs until the steps below are done in the
Supabase and Vercel dashboards — no code change can substitute for them.

## 1. Supabase

1. Create a Supabase project (or use an existing one).
2. In the SQL editor, run `supabase/migrations/0001_create_licenses.sql`.
   It creates `public.licenses` with Row Level Security **enabled and no
   policies** — the table is unreachable from the browser/anon key by
   design; every read/write goes through `SUPABASE_SERVICE_ROLE_KEY` from
   the serverless functions.
3. Copy `Project URL` and the `service_role` key (Project Settings > API)
   for the environment variables below. Never put the service_role key
   in anything shipped to the browser.

## 2. Stripe

1. The price already exists: `price_1UHNgV2cZZwb2lytBbn1U8vk` (EU
   Compliance Suite – Licence complète, one-time payment).
2. Developers > API keys: copy the **secret** key (`sk_live_...` or
   `sk_test_...` while testing) for `STRIPE_SECRET_KEY`.
3. Developers > Webhooks > Add endpoint:
   - URL: `https://cmsight.vercel.app/api/stripe/webhook`
   - Event: `checkout.session.completed`
   - Copy the endpoint's **signing secret** (`whsec_...`) for
     `STRIPE_WEBHOOK_SECRET`.

## 3. Resend (optional — license email delivery)

1. Create an API key at resend.com and verify a sending domain.
2. Set `RESEND_API_KEY` and `LICENSE_FROM_EMAIL` (e.g.
   `licenses@yourdomain.com`). If left unset, licenses are still created
   normally — only the confirmation email is skipped.

## 4. Vercel environment variables

Project Settings > Environment Variables, set for Production (and
Preview if you test there):

```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_ID=price_1UHNgV2cZZwb2lytBbn1U8vk
RESEND_API_KEY
LICENSE_FROM_EMAIL
CHECKOUT_SUCCESS_URL=https://cmsight.vercel.app/checkout/success
CHECKOUT_CANCEL_URL=https://cmsight.vercel.app/checkout/cancel
```

`CHECKOUT_SUCCESS_URL` / `CHECKOUT_CANCEL_URL` are optional — if unset,
`/api/checkout` falls back to redirecting to `eu-compliance-suite.html`
on the request's own origin. The dedicated pages
(`checkout/success/index.html`, `checkout/cancel/index.html`) give a
cleaner post-payment experience and are what these two variables point
to by default.

`.env.example` lists the same variables with no values, for local
reference — never commit a real `.env`.

## 5. Routes added

- `GET  /api/health` → `{ "ok": true }`
- `POST /api/checkout` → creates a Stripe Checkout session for the
  configured price and returns `{ "url": "..." }`. Stripe Checkout
  itself collects the buyer's email.
- `POST /api/stripe/webhook` → verifies the Stripe signature, and on a
  paid `checkout.session.completed` for the configured price, creates a
  license row (`EUC-XXXXXXXX-XXXXXXXX-XXXXXXXX`, 12-month expiry) and
  emails it via Resend if configured. Idempotent on `stripe_session_id`.
- `POST /api/license/activate` → body `{ license, site_url, product }`.
  Validates the license, binds it to the first site that activates it,
  rejects other sites/expired/revoked licenses, and returns
  `{ success, email, expires }`. This is the endpoint the WordPress
  plugin calls at `https://cmsight.vercel.app/api/license/activate`.

## 6. Commercial page

`eu-compliance-suite.html` presents the product (GPSR free, the three
licensed features) with a "Acheter la licence complète" button that
calls `/api/checkout` and redirects to Stripe Checkout. It's linked
from the homepage nav ("EU Compliance Suite").

## 7. Testing before going live

- Use Stripe test mode keys + `stripe listen --forward-to
  localhost:3000/api/stripe/webhook` (via `vercel dev`) to confirm a
  test purchase creates a `licenses` row and (if Resend is configured)
  sends the email.
- Call `POST /api/license/activate` with the resulting key and a
  `site_url` to confirm activation, then retry with a different
  `site_url` to confirm it's rejected.
