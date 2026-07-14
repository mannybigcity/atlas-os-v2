# Architecture Decisions

## Purpose of Atlas OS v2

Atlas OS v2 is Manny's private Founder OS. It should help him understand what
matters across his businesses, clients, projects, products, and ideas; decide
what to do next; and execute without scattering context across tools.

The first founder wedge is a private Founder Home built above the existing
organization, client-review, and Lion's Den foundation. Atlas For Entrepreneurs
remains the separate public sales and client-acquisition website.

## Role of the Next.js application

The Next.js app is the primary web application for Atlas. During the initial build, it will serve three related surfaces:

- Public website
- Client dashboard
- The Lion's Den admin/operator area

The public website, client dashboard, and The Lion's Den will stay inside the same Next.js application for now. The code should still keep The Lion's Den modular enough that it could become a separate internal application later without rebuilding the entire system.

The app is now a working production foundation. It should remain lightweight
and should extend verified workflows instead of introducing parallel systems.

## Planned role of Supabase

Supabase is the implemented backend and authentication foundation.

Expected responsibilities:

- PostgreSQL database
- Supabase Auth
- Row-level security for tenant isolation
- Supabase Storage for uploaded and generated documents
- `pgvector` for initial AI retrieval
- Edge functions only when they clearly simplify backend workflows

Supabase is already in production. New tables must preserve organization
isolation, Row Level Security, auditability, and server-side privileged access.

## Authentication

Approved decision: use Supabase Auth.

Supabase authentication is implemented through the shared `/login` entry, with
server-side protection for client and Super Admin routes.

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
/                  Public Atlas website
/login             Shared login entry
/client            Client dashboard
/lions-den         Super Admin dashboard
```

Approved decision: use these routes for the initial build.

The important architectural principle is separation by route, permission, and purpose, even while all surfaces live in the same Next.js app.

## Billing

Billing should not be implemented yet.

When billing is introduced, design around a provider abstraction so PayPal, Stripe, or another provider can be connected without spreading billing logic throughout the application.

The initial Atlas pricing model is not approved yet.

## AI cost controls

Atlas must not add AI provider calls until the cost-control rules in
`docs/AI_COST_CONTROLS.md` are satisfied.

Approved direction:

- AI calls must go through a server-side gateway.
- Provider keys must never be exposed to the browser.
- AI usage must be attributable to an organization, user, feature, and model.
- No autonomous loops, hidden background jobs, or duplicate model stacks.
- The first AI feature should be narrow, user-triggered, and logged.

## Where things should live

### Source code

Source code lives in GitHub in `mannybigcity/atlas-os-v2`.

Local development currently lives in this workspace:

```text
C:/Users/User/Documents/Codex/2026-06-28/do/atlas-os-v2
```

### Business data

Business data should live in Supabase Postgres once persistence is introduced. Every client-owned record should be scoped to an organization/workspace.

Examples:

- Users
- Organizations/workspaces
- Memberships
- Business profiles
- Activity events
- Future contacts, tasks, opportunities, notes, and decisions

### Documents

Uploaded or generated documents should live in Supabase Storage initially.

Document metadata should live in Postgres. Raw files should not be stored directly in database tables.

Required document metadata:

- Ownership
- Access level
- Document type
- Upload date
- Retention metadata

Retention automation should not be created yet.

### AI-retrieval knowledge

AI-retrieval knowledge should be derived from approved workspace data and documents.

Approved initial direction:

- Source records in Postgres
- Source files in object storage
- Retrieval index in Supabase Postgres with `pgvector`

Do not introduce a separate vector database until there is measurable evidence that Supabase cannot meet Atlas's retrieval needs.

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
    page.tsx
    login/
    client/
    lions-den/
  components/
  features/
    public-site/
    client/
    lions-den/
  lib/
  server/
    auth/
    billing/
    db/
    documents/
    retrieval/
  styles/
```

Do not create these folders until there is a real implementation need.

## Minimum security and compliance posture

Before storing real client data, Atlas must have:

- Real authentication
- Role-based access control
- Row Level Security on all client-owned data
- Separation of client records by organization
- No secrets committed to Git
- Server-side handling of privileged operations
- Audit fields on important records
- Basic access and activity logging
- Secure environment-variable management
- Production HTTPS
- Backup and recovery planning

## First three implementation milestones

### 1. Foundation and decision record

Maintain a clean scaffold, planning documents, working lint/build, and clear architecture decisions.

### 2. Clickable product shell

Create a non-functional shell that shows `/`, `/login`, `/client`, and `/lions-den` with clear separation of public, client, and Super Admin surfaces. No auth, database, AI, billing, or real workflows yet.

### 3. SaaS foundation

Add the first real backend layer: Supabase Auth, Supabase Postgres, organization/workspace model, role model, Row Level Security, and tenant-safe data access.

## Deferred Decisions

These remain intentionally deferred:

- Final pricing model
- Initial billing provider
- Exact document retention periods
- Whether The Lion's Den becomes a separate application
- Whether Atlas eventually needs a separate vector database

## Risk: building too much too early

Atlas will fail faster from overbuilding than from starting too small.

Main risks:

- Building a generic AI chatbot before the business context model is useful.
- Adding auth, billing, database, storage, and AI before the product shell proves the workflow.
- Creating admin tools before we know what operators actually need.
- Designing a complex CRM instead of validating the command center loop.
- Paying for external services before they directly support revenue, security, speed, or customer experience.

Default bias: build the smallest foundation that makes the next decision clearer.
