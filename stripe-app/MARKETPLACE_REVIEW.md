# Marketplace review readiness

Do not submit this app to the Stripe App Marketplace until the owner approves. Do not upload it to a live account until the owner says so. This checklist is the packet for that later review.

Publishing rules that block review if ignored:

- Publish from a Stripe account **without Connect enabled**.
- One public app per Stripe account.
- The account is Atlas For Entrepreneurs, not SIS Custom Creations.
- Distribution is `public` and `stripe_api_access_type` is `oauth`. After the first upload, Stripe does not let you change the API authentication method.

## Listing copy

**Name:** Atlas Bookkeeping

**Developer:** Atlas For Entrepreneurs

**Short description:** Read-only bookkeeping records for an Atlas workspace. Atlas never holds or moves funds.

**Long description:**

Atlas Bookkeeping copies charges, refunds, fees, payouts, invoices, and the customer name and email already on those records into an Atlas For Entrepreneurs workspace. The workspace can filter by date and category, see totals, and export a CSV.

Atlas requests read permission only. It does not create charges, refunds, payouts, or transfers, and it does not hold funds. Disconnecting in Atlas deletes that workspace's copied Stripe data and asks Stripe to revoke the token. The merchant can also uninstall the app in the Stripe Dashboard.

This is record-keeping, not tax or accounting advice.

**Support URL:** https://atlasforentrepreneurs.com/privacy

**Support email:** info@atlasforentrepreneurs.com

**Privacy URL:** https://atlasforentrepreneurs.com/privacy

**Terms URL:** https://atlasforentrepreneurs.com/terms

**Marketplace install URL (after publish):** a page on `https://atlasforentrepreneurs.com/client/bookkeeping` that starts the OAuth install link from the app's Settings tab. External-test links are not the public install URL. Public OAuth links do not work until the app is published; Stripe review can still install through the public link.

## Screenshots to capture before submission

Replace `icon.png` with the final 300×300 PNG first. Then capture:

1. Stripe's install screen showing only the read permissions in the manifest.
2. The Atlas bookkeeping screen before a connection, including the sentence "This is record-keeping, not tax or accounting advice."
3. The connected ledger with date and category filters and the sales, refunds, fees, payouts, and net totals.
4. A downloaded CSV opened enough to show the header row and that it has no tokens.
5. The disconnect control with the delete confirmation.
6. The privacy policy section "Stripe bookkeeping records" and the terms section "Stripe bookkeeping".

## Test account steps for review

1. Apply `supabase/migrations/20261020150000_stripe_bookkeeping.sql` to the Atlas Supabase project the reviewer will use.
2. Set the environment variables in `docs/STRIPE_BOOKKEEPING.md` on a non-production deploy. Leave production off until the owner approves a deploy.
3. In the app's External test tab, copy the OAuth install link into `STRIPE_APP_AUTHORIZE_URL` if it differs from the public marketplace URL. Set `STRIPE_APP_OAUTH_MODE=test` and `STRIPE_APP_TEST_SECRET_KEY` to that environment's secret key.
4. Sign in to Atlas as a workspace owner. Open `/client/bookkeeping` and choose Connect Stripe.
5. Approve the read permissions with a Stripe test account that is not the SIS Custom Creations account.
6. Confirm ledger rows appear, filters and totals change, and CSV export downloads.
7. Send a signed test webhook (`charge.succeeded` or `account.application.deauthorized`) to `/api/stripe/bookkeeping/webhook`.
8. Disconnect from Atlas. Confirm the workspace's Stripe rows and tokens are gone. In Stripe, uninstall the app as well if it is still installed. Stripe does not let a read-only app force every uninstall; Atlas still discards its copy and calls `POST https://api.stripe.com/v1/oauth/deauthorize`.
9. Confirm a second workspace cannot see the first workspace's rows.

## Webhook endpoint the owner registers

URL: `https://atlasforentrepreneurs.com/api/stripe/bookkeeping/webhook`

Stripe's Dashboard labels installed-app event delivery as "Listen to events on Connected accounts." That label is Stripe's webhook routing for apps. This app is still not a Connect platform, and the publisher account must not have Connect enabled.

Subscribe the endpoint to:

- `charge.succeeded`, `charge.updated`, `charge.refunded`, `charge.captured`
- `refund.created`, `refund.updated`
- `payout.created`, `payout.updated`, `payout.paid`, `payout.failed`, `payout.canceled`
- `invoice.finalized`, `invoice.paid`, `invoice.updated`, `invoice.voided`, `invoice.marked_uncollectible`
- `customer.created`, `customer.updated`, `customer.deleted`
- `account.application.authorized`, `account.application.deauthorized`
- `apps.install.created`, `apps.install.updated`, `apps.install.deleted`
- `app.install.created`, `app.install.updated`, `app.install.deleted` (names used before API version 2026-09-30)

Register a second endpoint for test mode and store its signing secret in `STRIPE_BOOKKEEPING_WEBHOOK_SECRET_TEST`. The live bookkeeping endpoint uses `STRIPE_BOOKKEEPING_WEBHOOK_SECRET`. Do not put either value in `STRIPE_WEBHOOK_SECRET`; that name is the Atlas billing webhook and bookkeeping does not fall back to it.

## Owner still has to do

- Provide the app's `ca_` client id, the app account's secret key, webhook signing secrets, a 32-byte encryption key, and the job secret.
- Confirm AFE's own Stripe account is not connected today, and choose the non-Connect publisher account.
- Apply the migration. Do not merge, deploy to production, create the Stripe account, or submit the app as part of this change.
