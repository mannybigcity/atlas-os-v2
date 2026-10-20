# Atlas Bookkeeping Stripe App

Atlas Bookkeeping is a read-only reporting and record-keeping tool for an Atlas For Entrepreneurs workspace. It copies charges, refunds, fees, payouts, invoices, and the customer details already on those records. It never holds funds, never moves funds, and never creates charges, refunds, or payouts.

This is record-keeping, not tax or accounting advice.

The app manifest is `stripe-app.json`. `stripe_api_access_type` is `oauth`. This is Stripe Apps OAuth (`https://marketplace.stripe.com/oauth/v2/authorize` and `https://api.stripe.com/v1/oauth/token`). It is not Stripe Connect. Do not point this app at `connect.stripe.com`. Connect `read_only` OAuth is closed to new builds.

## Publish from a separate Stripe account

- Create or choose a Stripe account that belongs to Atlas For Entrepreneurs.
- That account must **not** have Stripe Connect enabled. Stripe allows one public app per account, and a Connect platform account cannot publish a marketplace app.
- Do not use the SIS Custom Creations Stripe account, keys, or data.
- Do not use AFE's customer-billing Stripe account for this app if that account has Connect enabled. The owner confirms which AFE account is the app publisher.
- Upload from this folder with the Stripe CLI signed into that account: `stripe apps upload`.
- Local redirect overrides live in `stripe-app.dev.json`: `stripe apps upload --manifest stripe-app.dev.json` is for development only.

`icon.png` is a 300×300 placeholder. Replace it with the final marketplace icon before review.

## Permissions

Every requested permission is read-only.

| Permission | Why |
| --- | --- |
| `charge_read` | Read charges and refunds. Stripe's current permission for `GET /v1/refunds` is `charge_read`. |
| `payout_read` | Read payouts. |
| `invoice_read` | Read invoices. |
| `customer_read` | Read the customer name and email already on a payment. |
| `balance_read` | Read balance transactions. The current permission id for `GET /v1/balance_transactions` is `balance_read` (this is the ledger read that used to be described as `balance_transaction_read`). |
| `balance_transaction_source_read` | Read the charge, refund, or payout a balance transaction came from. |
| `event_read` | Receive webhook events, including install and uninstall. |

No write permission is requested. Changing a permission later forces every installed account to re-authorize.

## Redirects

Production callback, and the first allowed redirect:

`https://atlasforentrepreneurs.com/api/stripe/bookkeeping/callback`

After install, Stripe can send the user to `https://atlasforentrepreneurs.com/client/bookkeeping`.

The public install URL does not work until the app is published. External test links come from the app's External test tab in the Dashboard.
