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

**Count rule.** N is the number of AFE trial workspaces whose owner has an
`atlas_trial_profiles` row and whose `trial_started_at` is within the last 7
days **or** whose `trial_ends_at` is still in the future. There is no processed
flag yet; this window is the human-approval queue. Expired trials drop off.

**Click.** The inbox lists company name, owner name, email, started date, and
email confirm status. A row opens that org’s desk with the existing
`/client?previewOrg=<slug>` pattern. Trials are never copied into Prospects or
HUNTER. Atlas does not email, call, or text anyone.

**Exclusions.** SIS Custom Creations, sample desk `afe-crm-demo`, the AFE
operator desk, QTime, the founder mailbox, and `@atlasforentrepreneurs.com`
identities. Rows without an organization slug are omitted because they cannot
open `previewOrg`.

**Proof shape.** A trial org like `bright-path-cleaning-2ead43` (Bright Path
Cleaning) created on 2026-09-05 appears when it has a trial profile, an owner
membership, and is inside the 7-day window.

## Next recommended step

Apply and verify the reviewed Supabase migrations through the approved
workflow, then complete the production pilot checklist. The operations
registry migration creates no records and is not proof of live application.
