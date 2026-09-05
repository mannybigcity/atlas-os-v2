# Atlas OS v2

Atlas is an AI-powered operating system for entrepreneurs and small businesses.

Atlas OS v2 is a secure, organization-scoped SaaS foundation for entrepreneurs
and small businesses. It currently supports authentication, client/Super Admin
access boundaries, business context, shared note conversations, an attention
inbox, and activity history. Billing and AI remain intentionally disabled.

## Guiding principles

- Massive Action
- Maximum Effort
- Minimal Money

Every engineering decision should help generate revenue, reduce costs, save time, improve security, or create a better customer experience.

## Current scope

The current foundation includes:

- Next.js, TypeScript, Tailwind, and App Router
- Supabase Email/Password authentication
- Organization memberships and RLS tenant isolation
- Client and Super Admin surfaces
- Business profiles and threaded note conversations
- Super Admin attention inbox and organization activity history
- Sales CRM and approval-gated follow-up records
- Additive organization-scoped project/mission and cash-ledger foundation
- Production-pilot deployment and onboarding documentation

Still intentionally excluded:

- Billing and payment processing
- Payment-provider webhooks, fulfillment, and verified production cash records
- AI integrations
- Document synchronization and broad task-management automation
- Extra UI/component libraries

## Getting started

Install dependencies:

```bash
npm install
```

Run the development server on the reserved Atlas for Entrepreneurs port:

```bash
npm run dev
```

On Windows PowerShell, use `npm.cmd run dev` if the PowerShell npm shim is
blocked.

Open http://localhost:3000.

Real credentials belong only in `.env.local` locally and in the hosting
provider's encrypted environment-variable settings for production.

## Project structure

```text
docs/                 Architecture, setup, and operating documents
src/app/              Next.js routes and server-rendered UI
src/server/           Server-side queries, guards, and actions
supabase/migrations/  Reviewed database migrations and RLS policies
```

## 7 Day Trial inbox (AFE operator desk)

Super-admin / AFE operator Lion’s Den (`/client` on Atlas For Entrepreneurs)
shows a left-nav item `7 Day Trial (N)`. It is hidden on SIS, the sample desk,
ordinary client desks, and while previewing another org.

**Source.** Derived from `organizations` + owner `organization_memberships` +
Auth. There is no `trial_inbox` table. `atlas_trial_profiles` is optional
enrichment only.

**Field map.** Company = `organizations.name`. Owner name = Auth
`user_metadata.full_name` (trial profile name if Auth has none). Email = Auth
owner email. Started = `organizations.created_at`, or trial profile start when
the org timestamp is missing. Email confirm = Auth `email_confirmed_at`.
Trial end / days remaining = start + 7 days.

**Count rule.** N is AFE trial workspaces in that window (start in the last 7
days **or** end still in the future) that are not upgraded. There is no
processed flag; this window is the human-approval queue.

**Status (computed, never stored).** First match: `upgraded` (linked billing),
`abandoned` (past end, never confirmed, never signed in), `expired` (past end),
`first_login` (signed in within 24 hours of start), `in_den` (signed in later),
`confirmed` (email confirmed, no sign-in), `signed_up` (not confirmed yet).
Upgraded orgs are excluded from the queue.

**Click.** A row opens that org’s desk with `/client?previewOrg=<slug>`.
Trials are never copied into Prospects or HUNTER. Atlas does not email, call,
or text anyone.

**Exclusions.** SIS Custom Creations, sample desk `afe-crm-demo`, the AFE
operator desk, QTime, the founder mailbox, `@atlasforentrepreneurs.com`
identities, and linked paid workspaces. Rows without a slug are omitted.

**Proof shape.** `bright-path-cleaning-2ead43` (Bright Path Cleaning) created
on 2026-09-05 appears when it is an AFE org with an owner membership and sits
inside the 7-day window.

## Next recommended step

Apply and verify the reviewed Supabase migrations through the approved
workflow, then complete the production pilot checklist. The operations
registry migration creates no records and is not proof of live application.
