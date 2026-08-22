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

## Next recommended step

Apply and verify the reviewed Supabase migrations through the approved
workflow, then complete the production pilot checklist. The operations
registry migration creates no records and is not proof of live application.
