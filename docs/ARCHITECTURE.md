# Architecture

## Current architecture scope

This repo currently contains only the planning foundation and a minimal Next.js application scaffold.

No authentication, database, billing, AI provider, or external SaaS service has been added yet.

## Recommended long-term architecture

Atlas should grow into a modular SaaS platform with these layers:

1. Identity and workspace layer
2. Business data layer
3. AI orchestration layer
4. Workflow layer
5. Integration layer

We should add these layers only when the product milestone requires them.

## Initial technical stack

The recommended initial stack:

- Next.js with the App Router
- TypeScript
- Tailwind CSS
- React
- ESLint

Future additions, when justified:

- PostgreSQL for the system of record
- A thin ORM such as Prisma or Drizzle
- Stripe for billing
- A managed auth provider or Auth.js
- OpenAI API for AI functionality
- Sentry for error tracking
- PostHog for product analytics

## Architecture principles

### Keep the foundation boring

Use proven tools, predictable deployment patterns, and simple code organization. Atlas should spend its complexity budget on product value, not infrastructure novelty.

### Build for multi-tenancy early

When the database is introduced, every business object should belong to a workspace. Queries must be workspace-scoped by default.

### Treat AI actions as risky by default

Early AI functionality should recommend, summarize, and draft. Destructive or external actions should require explicit user approval.

### Prefer reversible decisions

Early-stage architecture should avoid heavy commitments unless they directly unlock revenue, security, speed, or customer value.

## Proposed future app structure

```text
src/
  app/                 Routes and layouts
  components/          Shared UI components
  lib/                 Shared utilities
  server/              Server-only services and data access
  features/            Product feature modules
```

Only `src/app` exists right now because we are intentionally keeping the scaffold minimal.

## Security baseline, later milestone

When we introduce real customer data, the baseline should include:

- Workspace-scoped records
- Role-based access control
- Secret management through environment variables
- Audit logs for important actions
- Rate limiting
- Safe logging that avoids sensitive data
- Explicit approval for AI actions that affect external systems
