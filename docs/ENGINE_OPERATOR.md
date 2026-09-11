# Engine operator card

## What shipped

Branch `cursor/afe-night-engine` adds:

- `supabase/migrations/20260909140000_afe_engine.sql`
- `netlify/functions/overnight-engine.mjs`
- schedule entry in `netlify.toml`

The job reads `atlas_sales_prospects` (founder sales CRM), skips won/lost/disqualified/duplicate and active suppressions, queues up to 7 drafts, writes `morning_briefs`, emails the owner via Resend. It never sends outreach.

## You still have to click

Grok cannot apply production SQL or set Netlify secrets.

1. Merge the PR or deploy this branch.
2. Paste the migration into the **production** Supabase SQL editor and run it.
   `service_role` needs SELECT, INSERT, UPDATE on `public.engine_runs`, `public.engine_drafts`, and `public.morning_briefs` for the Netlify overnight-engine function (`20260911190000_afe_engine_service_role_grants.sql`).
3. Confirm these already exist on Netlify (same as chat digest):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `RESEND_API_KEY`
   - `ATLAS_NOTIFICATION_FROM`
   - `ATLAS_NOTIFICATION_EMAILS` or `ATLAS_SUPER_ADMIN_EMAILS`
4. Netlify → Functions → `overnight-engine` → Run now.
5. Check `engine_runs.notes` for `prospects_seen=`.
6. Read the email. Approve drafts. You send.

## Homepage promise

> Atlas finds the next conversation, drafts the follow-up, and parks it for one-tap approval. You wake up to a brief. Nothing sends without you.
