# EU Compliance Suite — deployment notes

The site itself is still fully static (index.html, en.html, style.css,
script.js) and deploys unchanged. This adds a licensing/payment backend
as Vercel Serverless Functions under `/api`, backed by Supabase and
Stripe. None of this runs until the steps below are done in the
Supabase and Vercel dashboards — no code change can substitute for them.

## 1. Supabase

1. Create a Supabase project (or use an existing one).
2. In the SQL editor, run, in order:
   - `supabase/migrations/0001_create_licenses.sql` — `public.licenses`
     (EU Compliance Suite).
   - `supabase/migrations/0002_create_purchases_and_access_tokens.sql` —
     `public.purchases` (proof of a Cmsight purchase) and
     `public.access_tokens` (hashed customer-portal magic-link tokens).
   All three tables have Row Level Security **enabled and no policies** —
   unreachable from the browser/anon key by design; every read/write goes
   through `SUPABASE_SERVICE_ROLE_KEY` from the serverless functions.
3. Copy `Project URL` and the `service_role` key (Project Settings > API)
   for the environment variables below. Never put the service_role key
   in anything shipped to the browser.

## 2. Stripe

1. Two products/prices exist:
   - `price_1UHNgV2cZZwb2lytBbn1U8vk` — EU Compliance Suite – Licence
     complète (one-time). Paying this triggers the full automatic flow:
     a license key is generated, stored, and emailed.
   - `price_1UHdhs2cZZwb2lyt4BBuPJlS` — Cmsight – Licence à vie, 79€
     (one-time). Paying this only sends a confirmation email; there is
     **no automatic license** for this product, by design — follow up
     manually with the buyer.
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
STRIPE_PRICE_ID_CMSIGHT=price_1UHdhs2cZZwb2lyt4BBuPJlS
RESEND_API_KEY
LICENSE_FROM_EMAIL
CHECKOUT_SUCCESS_URL=https://cmsight.vercel.app/checkout/success
CHECKOUT_CANCEL_URL=https://cmsight.vercel.app/checkout/cancel
SITE_URL=https://cmsight.vercel.app
CMSIGHT_DOWNLOAD_URL_WINDOWS
CMSIGHT_DOWNLOAD_URL_MAC
CMSIGHT_VERSION
LAUNCH_OFFER_END_DATE=2026-10-05
STRIPE_PRICE_ID_CMSIGHT_REGULAR
```

`CHECKOUT_SUCCESS_URL` / `CHECKOUT_CANCEL_URL` are optional — if unset,
`/api/checkout` falls back to redirecting to `eu-compliance-suite.html`
on the request's own origin. The dedicated pages
(`checkout/success/index.html`, `checkout/cancel/index.html`) give a
cleaner post-payment experience and are what these two variables point
to by default.

`SITE_URL` is used to build the customer-portal link emailed after a
Cmsight purchase (`{SITE_URL}/account.html?token=...`) — set it if the
production domain ever changes, otherwise the hardcoded fallback works.

`CMSIGHT_DOWNLOAD_URL_WINDOWS` / `CMSIGHT_DOWNLOAD_URL_MAC` /
`CMSIGHT_VERSION` are optional — leave them unset until the installers
are actually hosted somewhere. Until then, `account.html` tells buyers
the download will be available soon instead of showing a broken link.

`LAUNCH_OFFER_END_DATE` drives both the pricing-badge countdown on
`index.html`/`en.html` (via `GET /api/config`, public/no secrets) and the
actual price switch in `/api/checkout`. Set to 15 days from now
(`2026-10-05`) — checked live on each request, no cron needed. Past that
date, Cmsight checkout only switches to `STRIPE_PRICE_ID_CMSIGHT_REGULAR`
once you've created that price in Stripe and set the env var; until then
it keeps using the launch price, so nothing breaks if the new price isn't
ready yet. Leaving `LAUNCH_OFFER_END_DATE` unset means the offer never
ends.

`.env.example` lists the same variables with no values, for local
reference — never commit a real `.env`.

## 5. Routes added

- `GET  /api/health` → `{ "ok": true }`
- `GET  /api/config` → `{ "launchOfferActive": bool, "launchOfferEndsAt": "..." }`.
  Public, no secrets — drives the pricing-badge countdown.
- `POST /api/checkout` → body `{ "product": "eu-compliance-suite" |
  "cmsight" }` (defaults to `eu-compliance-suite` if omitted). Creates a
  Stripe Checkout session for that product's price and returns
  `{ "url": "..." }`. Stripe Checkout itself collects the buyer's email.
  `lib/products.js` maps each product to its price env var and default
  success/cancel path.
- `POST /api/stripe/webhook` → verifies the Stripe signature, then
  identifies the product from the price Stripe actually charged (never
  from client input). For `eu-compliance-suite`: on a paid
  `checkout.session.completed`, creates a license row
  (`EUC-XXXXXXXX-XXXXXXXX-XXXXXXXX`, 12-month expiry) and emails it via
  Resend if configured; idempotent on `stripe_session_id`. For
  `cmsight`: records the purchase in `public.purchases` (idempotent on
  `stripe_session_id`), issues a customer-portal access token, and
  emails a link to `account.html` — no license row, no key, by design.
- `POST /api/license/activate` → body `{ license, site_url, product }`.
  Validates the license, binds it to the first site that activates it,
  rejects other sites/expired/revoked licenses, and returns
  `{ success, email, expires }`. This is the endpoint the WordPress
  plugin calls at `https://cmsight.vercel.app/api/license/activate`.
- `POST /api/portal/request-link` → body `{ email }`. Always returns the
  same generic message regardless of whether that email has a Cmsight
  purchase (avoids leaking who bought it). If it does, emails a fresh
  30-day access token to `account.html`.
- `POST /api/portal/downloads` → body `{ token }`. Resolves a
  customer-portal token (hash-compared, 30-day expiry) to the buyer's
  email and download links from `lib/products.js#getCmsightDownloads()`;
  returns `notReady: true` until the `CMSIGHT_DOWNLOAD_URL_*` vars are
  set.

## 6. Commercial pages

`eu-compliance-suite.html` presents the product (GPSR free, the three
licensed features) with "Acheter la licence complète" buttons
(`data-product="eu-compliance-suite"`, the default). It's linked from
the homepage nav ("EU Compliance Suite").

`index.html` / `en.html`'s pricing section has an "Acheter"/"Buy now"
button with `data-product="cmsight"` for the 79€ app license. Both
buttons share the same handler in `script.js` (class `buy-license-btn`),
which reads `data-product` and posts it to `/api/checkout`.

`account.html` is the customer portal for Cmsight buyers: enter your
email to get an access link (`/api/portal/request-link`), or open the
page with `?token=...` (from the emailed link) to see download links
(`/api/portal/downloads`). Linked from the site footer and from
`checkout/success/index.html` after a Cmsight purchase.

## 7. Testing before going live

- Use Stripe test mode keys + `stripe listen --forward-to
  localhost:3000/api/stripe/webhook` (via `vercel dev`) to confirm a
  test purchase creates a `licenses` row and (if Resend is configured)
  sends the email.
- Call `POST /api/license/activate` with the resulting key and a
  `site_url` to confirm activation, then retry with a different
  `site_url` to confirm it's rejected.
