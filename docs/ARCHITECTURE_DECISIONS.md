# Architecture Decisions

## Purpose of Atlas OS v2

Atlas OS v2 is the foundation for an AI-powered operating system for entrepreneurs and small businesses. The product should help owners understand what matters, decide what to do next, and execute faster without scattering business context across tools.

The first product wedge remains narrow: an AI chief of staff and command center for service-based entrepreneurs.

## Role of the Next.js application

The Next.js app is the primary web application for Atlas. It should eventually serve three related surfaces:

- Public website
- Client dashboard
- The Lion's Den admin/operator area

For now, the app is only a minimal scaffold. It should stay lightweight until the product flow is clearer.

## Planned role of Supabase

Supabase is the planned backend foundation when persistence is introduced.

Expected responsibilities:

- PostgreSQL database
- Auth, if we choose Supabase Auth after review
- Row-level security for tenant isolation
- File/object storage for uploaded documents, if it fits cost and security needs
- Edge functions only when they clearly simplify backend workflows

Supabase should not be added until we are ready for the SaaS foundation milestone.

## Access model: Super Admin and Client

Atlas should support two major access levels:

- Super Admin: Atlas internal operators who manage the platform, tenants, support, diagnostics, and high-level configuration.
- Client: business owners and team members who use Atlas inside their own workspace.

Client access should be workspace-scoped. Super Admin access should be tightly limited, audited, and separated from normal customer workflows.

## Public website, client dashboard, and The Lion's Den

These surfaces should be separated by route, permission, and purpose:

- Public website: marketing, positioning, pricing, lead capture, and documentation.
- Client dashboard: the customer-facing Atlas command center and business workflows.
- The Lion's Den: internal Atlas operations console for Super Admin users.

Initial route direction:

```text
/                  Public website
/dashboard         Client dashboard
/lion              The Lion's Den
```

This route plan is provisional. The important decision is separation of concerns, not final URL naming.

## Where things should live

### Source code

Source code lives in GitHub in `mannybigcity/atlas-os-v2`.

Local development currently lives in this workspace:

```text
C:/Users/User/Documents/Codex/2026-06-28/do/atlas-os-v2
```

### Business data

Business data should eventually live in Supabase Postgres. Every customer-owned record should be scoped to a workspace.

Examples:

- Users
- Workspaces
- Memberships
- Business profiles
- Activity events
- Future contacts, tasks, opportunities, notes, and decisions

### Documents

Uploaded or generated documents should eventually live in object storage, likely Supabase Storage unless a better cost/security tradeoff appears.

Document metadata should live in Postgres. Raw files should not be stored directly in database tables.

### AI-retrieval knowledge

AI-retrieval knowledge should be derived from approved workspace data and documents.

The likely future direction:

- Source records in Postgres
- Source files in object storage
- Retrieval index in Postgres with vector support or a separate vector service if scale requires it

We should avoid adding a separate vector database until Postgres cannot meet the need.

## Proposed folder structure

Near-term structure:

```text
docs/
  ARCHITECTURE.md
  ARCHITECTURE_DECISIONS.md
  DATA_MODEL.md
  MILESTONES.md
  PRODUCT_VISION.md
src/
  app/
    page.tsx
    layout.tsx
    globals.css
```

Proposed structure as the app grows:

```text
src/
  app/
    (public)/
    (client)/
    lion/
  components/
  features/
  lib/
  server/
  styles/
```

Do not create these folders until there is a real implementation need.

## First three implementation milestones

### 1. Foundation and decision record

Maintain a clean scaffold, planning documents, working lint/build, and clear architecture decisions.

### 2. Clickable product shell

Create a non-functional shell that shows the public website, client dashboard direction, and admin separation. No auth, database, AI, billing, or real workflows yet.

### 3. SaaS foundation

Add the first real backend layer: authentication decision, Supabase project, workspace model, role model, and tenant-safe data access.

## Unresolved architecture decisions

These require approval before implementation:

- Whether Supabase Auth is the auth provider or whether we use another provider.
- Final route names for The Lion's Den and client dashboard.
- Whether The Lion's Den lives in the same app long-term or becomes a separate internal app later.
- Initial billing provider and pricing model.
- Whether AI retrieval starts with Postgres vector support or a separate vector database.
- Document storage provider and retention rules.
- Required compliance posture before storing real customer data.

## Risk: building too much too early

Atlas will fail faster from overbuilding than from starting too small.

Main risks:

- Building a generic AI chatbot before the business context model is useful.
- Adding auth, billing, database, storage, and AI before the product shell proves the workflow.
- Creating admin tools before we know what operators actually need.
- Designing a complex CRM instead of validating the command center loop.
- Paying for external services before they directly support revenue, security, speed, or customer experience.

Default bias: build the smallest foundation that makes the next decision clearer.
