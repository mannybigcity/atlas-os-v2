# Stripe bookkeeping

Atlas For Entrepreneurs can keep a read-only copy of a workspace's Stripe ledger. The Stripe App lives in `stripe-app/`. The desk is `/client/bookkeeping`. The feature is off unless `STRIPE_BOOKKEEPING_ENABLED=true`.

This is record-keeping, not tax or accounting advice. Atlas never holds or moves funds through this integration.

## Separate from SIS Custom Creations

Use an Atlas For Entrepreneurs Stripe account and Supabase project only. Do not copy SIS Custom Creations API keys, webhook secrets, customer data, or Connect settings into these variables. The app must be published from a Stripe account that does not have Connect enabled. Stripe allows one public app on that account.

AFE's own Stripe account is not connected to this app or this environment today. Nothing in the repo contains a live Stripe key.

## What the owner must provide

| Variable | Who provides it | Notes |
| --- | --- | --- |
| `STRIPE_BOOKKEEPING_ENABLED` | Owner, after review | Default `false`. |
| `STRIPE_APP_CLIENT_ID` | Stripe App settings (`ca_...`) | Not a secret, but still account-specific. Do not commit a real value. |
| `STRIPE_APP_SECRET_KEY` | App developer account, live secret key | Used only to exchange and refresh OAuth tokens at `https://api.stripe.com/v1/oauth/token`. Server only. |
| `STRIPE_APP_TEST_SECRET_KEY` | Same account, test or sandbox secret key | Required for external test installs. |
| `STRIPE_APP_OAUTH_MODE` | `live` or `test` | Must match the key and the install link. |
| `STRIPE_APP_AUTHORIZE_URL` | Optional | Blank uses `https://marketplace.stripe.com/oauth/v2/authorize`. Paste the External test link while the app is unpublished. |
| `STRIPE_WEBHOOK_SECRET` | Webhook endpoint (`whsec_...`) | Server only. |
| `STRIPE_WEBHOOK_SECRET_TEST` | Test endpoint, optional | Server only. |
| `STRIPE_TOKEN_ENCRYPTION_KEY` | Owner generates 32 bytes, base64 | Encrypts tokens at rest. Losing it makes saved tokens unreadable; the workspace reconnects. |
| `STRIPE_BOOKKEEPING_JOB_SECRET` | Owner generates a long random string | Authorizes the backfill background function. |
| `STRIPE_BOOKKEEPING_BACKFILL_MONTHS` | `12` to `24` | Default `24`. |
| `NEXT_PUBLIC_SITE_URL` | Already used by Atlas | Builds the OAuth redirect. Production must be `https://atlasforentrepreneurs.com`. |
| `SUPABASE_SERVICE_ROLE_KEY` | Already used by Atlas | Server only. Writes tokens and ledger rows. The browser never receives it. |

Generate the encryption key with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Empty placeholders are in `.env.example`. Do not commit `.env.local` or real secrets.

## What is implemented

- OAuth install from the workspace, CSRF `state` stored as a hash for 10 minutes, one-time use, tied to the signed-in owner or admin.
- Code exchange and refresh on `https://api.stripe.com/v1/oauth/token` with the app secret key. Tokens whose scope is not `stripe_apps` are refused.
- Tokens encrypted with AES-256-GCM. They are stored in `stripe_bookkeeping_secrets`, which has row level security and no anon or authenticated policies.
- First sync walks 12–24 months. A background function continues it. Webhooks update single events after signature checks. A nightly function at 08:15 UTC catches misses and resumes cursors.
- Ledger upserts are idempotent on `(organization_id, stripe_object_id)`.
- Disconnect calls `POST https://api.stripe.com/v1/oauth/deauthorize` and then hard-deletes that workspace's Stripe rows. If Stripe refuses the revocation, the local rows are still deleted and the screen tells the merchant to uninstall the app in the Stripe Dashboard. Stripe does not let a read-only app force every uninstall.
- The desk lists and filters by date and category, shows totals, and exports CSV.

## Apply the database change

Run `supabase/migrations/20261020150000_stripe_bookkeeping.sql` in the Atlas Supabase project when the owner is ready. Do not apply it to a SIS project. This change does not run the migration itself.

## Not done in this change

- No production deploy.
- No Stripe account is created.
- The app is not uploaded and not submitted to the Marketplace. See `stripe-app/MARKETPLACE_REVIEW.md`.
