# Atlas Agent Launch Runbook

Last updated: July 15, 2026

This runbook launches the first controlled versions of ATLAS, HUNTER, MICAH,
and DAVID. They are named workflows inside one Atlas operating system, not four
unbounded bots and not four separate subscriptions.

## What is ready in the repository

- **ATLAS:** one private Sales Command surface coordinating prospect research,
  pipeline ownership, approval, content drafts, and history.
- **HUNTER:** a user-triggered Google Places preview capped at ten transient
  results per search and twenty successful searches per UTC day. Result content
  is not persisted; each request and list-price exposure is logged.
- **DAVID:** a private, Super-Admin-only CRM with stages, fit, sources, next
  actions, immutable events, channel approvals, and contact suppressions.
- **MICAH:** a user-triggered OpenAI workflow that creates exactly three internal
  social-post drafts for one researched prospect. It logs model, tokens, and
  estimated cost. It cannot publish.
- **Public assessments:** new and existing consenting assessment submissions are
  copied into the private CRM by a database trigger/backfill.

No prospect email, SMS, social message, phone call, or public post is automatic.

## Activation order

Do these in order. Do not test MICAH or HUNTER before the usage ledger exists.

1. In the production Supabase SQL Editor, confirm the social-media migration was
   applied, then apply:

   - `20260715100000_atlas_sales_crm.sql`
   - `20260715101000_atlas_agent_usage_ledger.sql`

2. In the production deployment environment, set server-only variables:

   - `GOOGLE_PLACES_API_KEY`
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL=gpt-5-mini`
   - `NEXT_PUBLIC_SITE_URL=https://atlasforentrepreneurs.com`

   Never add `NEXT_PUBLIC_` to provider secrets. Never paste secret values into
   source code, a screenshot, chat, or a client-side component.

3. In Google Cloud:

   - enable Places API (New);
   - restrict the key to only the Places API and the production server use case;
   - add billing-budget alerts and a conservative provider quota;
   - confirm the billing account and project are the intended Atlas accounts.

4. In the OpenAI API billing settings, create a deliberately small project
   budget/alert. ChatGPT or Codex subscription charges are separate from OpenAI
   API usage. The code defaults to `gpt-5-mini`; change models only after pricing
   and the cost estimator are updated.

5. Deploy the application. Then sign in as Atlas Super Admin and open:

   `/lions-den/sales`

6. Run smoke tests in this order:

   - add one manual test prospect and confirm a creation event appears;
   - update its fit, owner, next action, and stage;
   - confirm a client user cannot open Sales Command or read CRM tables;
   - run one HUNTER search and confirm one successful usage-ledger row;
   - verify a result on Google Maps and the business's own public website;
   - add the independently verified business facts manually to the CRM;
   - try approving a missing channel and confirm the database blocks it;
   - approve one verified channel and confirm nothing is sent;
   - add a suppression and confirm approval is revoked;
   - on a non-contact test record, run MICAH once and verify three drafts plus a
     token/cost ledger row;
   - confirm no connected social account received a post.

## First ten prospects

The first goal is a small, high-quality learning batch, not a giant list.

1. Pick one vertical and one geography, for example HVAC businesses in Katy,
   Texas.
2. Run one HUNTER preview search.
3. Open each candidate's Google Maps listing, then verify useful facts on the
   business's own public website. Do not bulk-copy Google Maps content into the
   CRM.
4. Add only businesses that match the initial customer profile and record the
   business website as the source.
5. Give each record a fit reason and a specific DAVID next action.
6. Create a MICAH sample only for a strong candidate where seeing a concrete
   example would help a real conversation.
7. Manny reviews the destination, contact basis, suppression state, and message
   before approving any outreach channel.
8. Outreach remains manual until deliverability, compliance, opt-out handling,
   and reply capture are proven end to end.

Google's Places policy restricts storage of Places content other than permitted
exceptions such as place IDs and requires attribution. Atlas therefore uses the
current Places integration only as a transient discovery preview. Review the
current policy before changing that boundary:

https://developers.google.com/maps/documentation/places/web-service/policies

## QTIME onboarding

Q's email is not waiting in an Atlas automation queue; the application has no
automatic onboarding sender. The recorded project state says Q already has an
Auth user and QTIME owner membership, so verify that state before sending mail.

1. Confirm Q's address is `quincy@qtimeproductions.com`.
2. In Supabase SQL Editor, run a read-only join across `auth.users`,
   `organization_memberships`, and `organizations`; expect exactly one Q user,
   one `qtime-productions` membership, and role `owner`.

   ```sql
   select
     users.id,
     users.email,
     users.email_confirmed_at,
     users.last_sign_in_at,
     organizations.name,
     organizations.slug,
     memberships.role
   from auth.users users
   left join public.organization_memberships memberships
     on memberships.user_id = users.id
   left join public.organizations organizations
     on organizations.id = memberships.organization_id
   where lower(users.email) = lower('quincy@qtimeproductions.com');
   ```

3. In Supabase Authentication settings, confirm:

   - Site URL and allowed redirects use `https://atlasforentrepreneurs.com`;
   - custom SMTP is enabled with a verified Atlas sender;
   - the invite and recovery templates use the Atlas confirmation routes;
   - public signup is disabled;
   - email rate limits and Auth logs are healthy.

4. Test recovery once with an Atlas-owned external mailbox.
5. If Q's existing row and membership are correct, submit his address once on
   the live `/forgot-password` page. Check the Auth delivery log immediately.
6. Q creates his own password. Atlas never asks him to send it.
7. Verify Q sees only QTIME, cannot open `/lions-den`, and can sign out/in.

Do not send a second invitation to an existing Q user and do not repeatedly send
recovery links. Investigate the Auth log first if delivery fails.

## Integrations deliberately postponed

PayPal, Shopify, Etsy, Meta, Printify, and Ninja POD are not needed to acquire
and manage the first Atlas prospects. Their credentials may exist locally, but
no Atlas adapter currently uses them. Connect each only when a specific paid
workflow requires it, with its own least-privilege permissions, approval point,
usage logging, and revocation test.

The immediate revenue path is:

```text
one niche -> ten researched prospects -> manual conversations -> one paid pilot
-> deliver a measurable result -> proof/case study -> repeat
```
