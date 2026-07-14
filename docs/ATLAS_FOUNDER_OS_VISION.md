# ATLAS Founder OS Vision

Verified July 14, 2026. This document reconciles the Founder OS handoff with
the code and database migrations that actually exist in Atlas OS v2.

## The three Atlas surfaces

1. **Atlas For Entrepreneurs** is the public website that explains Manny's
   services, earns trust, captures leads, and helps turn prospects into paying
   clients.
2. **ATLAS OS** is Manny's private Founder OS for running businesses, client
   work, projects, products, apps, and new ideas from one secure command center.
3. **The client workspace** is a limited part of ATLAS OS. A client may access
   only their own organization, plan, actions, work, messages, and business
   profile.

Codex is a development tool used to build ATLAS OS. ATLAS is the product and
operating identity; Codex is not being renamed.

## Evidence labels

Every capability, integration, or agent claim must use one of these labels:

- **VERIFIED BUILT** - present in the canonical repository and production data
  path, with an appropriate test or production verification.
- **VERIFIED EXTERNAL** - a real business, account, asset, or service exists,
  but it is not necessarily connected to ATLAS OS.
- **OLD PROTOTYPE** - useful reference material that is not a production
  dependency.
- **PLANNED** - approved direction without a completed implementation.
- **IDEA** - worth preserving, but not approved for near-term construction.
- **UNKNOWN** - needs evidence or a decision before being treated as fact.

## Verified state today

### VERIFIED BUILT

- One canonical Next.js application with public, login, client, and Lion's Den
  routes.
- Supabase email/password authentication, password recovery, server-side route
  protection, organization memberships, and roles.
- Row Level Security and database-enforced tenant relationships for active
  organization-owned records.
- Editable organization business profiles.
- Organization notes, threaded messages, activity history, and an attention
  inbox.
- Organization-scoped 30-day plans and actions.
- Work for client review, client approval/change requests, reviewer identity,
  timestamps, and permanent work-message history.
- A Lion's Den surface that can manage more than one organization.
- A separate QTIME Productions organization with Quincy assigned as owner.

### VERIFIED EXTERNAL

- SIS Custom Creations and FRESH are real Manny-operated businesses.
- QTIME Productions is a paying founding client.
- Puter's evidence handoff reports a $50 QTIME payment on June 29, 2026. The
  underlying payment record still needs to be located before the commercial
  terms are considered verified.
- Roll'n Wars and Food4Thought Network are QTIME projects or brands, not
  separate Atlas customer organizations unless Quincy requests otherwise.
- KR Permits and Sugar Cruise Vibe are prospective opportunities.
- Manny has accounts or assets involving GitHub, Supabase, Netlify, Resend,
  Google, Shopify, Etsy, Printify, PayPal, GoDaddy, Meta, and DigitalOcean.
  None should be called an ATLAS integration until credentials, permissions,
  data flow, logging, and a production test are verified.

### OLD PROTOTYPE

- The original Atlas repository, provided by Manny on July 14, 2026:
  `https://github.com/mannybigcity/atlas-os`. Its contents have not yet been
  audited, so the repository is reference material rather than a production
  dependency.
- Earlier Atlas websites and static dashboards.
- Prompt-only or simulated agents.
- Old DigitalOcean experiments and prior authentication/demo data.
- Paperclip, Hermes, and other experimental runtimes unless separately audited
  and deliberately reimplemented.

### PLANNED

- A private Founder Home that summarizes all of Manny's businesses and work.
- Shared records for businesses, projects, products, ideas, founder tasks, and
  revenue opportunities.
- A simple prospect-to-paid assessment pipeline.
- One-at-a-time integrations that directly reduce work or produce revenue.
- Narrow, user-triggered, logged AI assistance with visible cost controls.
- Verified agents only after their tools, permissions, approvals, logs, and
  failure behavior exist.

### IDEA

- Marketplace and rewards systems.
- Broad business-intelligence dashboards.
- Autonomous multi-agent operations.
- Self-service SaaS expansion before the founder workflow and paid-client
  delivery loop are proven.

## Founder OS V1

### 1. Founder Home

The first private founder screen should answer five questions:

- What are the three most important outcomes today?
- Which client requests need Manny's response?
- Which check-ins or due dates are next or overdue?
- What work is waiting on Manny, and what is waiting on a client?
- What new idea, task, lead, or note needs fast capture?

### 2. Businesses and clients

Show every Manny-owned business and client organization in one list while
preserving strict access boundaries. Each record should show its purpose,
status, current goal, next action, and open work.

### 3. Projects and ideas

Capture an idea quickly, decide whether it belongs to a business, turn approved
ideas into projects, and always identify the next concrete action. An idea is
not a project until Manny deliberately promotes it.

### 4. Revenue pipeline

Track prospects, assessments, offers, paid pilots, expected value, next follow-
up, and current status. The first purpose is helping Manny earn revenue, not
building a full CRM.

### 5. Work and messages

Reuse the verified work-review system. Work-specific messages stay attached to
that work; unrelated messages remain separate and collapsed. Avoid duplicate
conversation areas.

## Two-lane execution plan

### Lane A - income now

1. Keep QTIME's paid pilot operational.
2. Confirm Quincy's exact goal, dates, locations, audience, and promised result.
3. Enter the real QTIME 30-day plan and three actions.
4. Produce one useful, human-reviewed package through ATLAS.
5. Record delivery time, client feedback, direct cost, and whether the outcome
   is repeatable for the next client.

### Lane B - build the Founder OS

1. Add the private Founder Home using existing organization, plan, action,
   review, attention, and activity data.
2. Add fast capture and founder-owned tasks without weakening client isolation.
3. Add projects and ideas only after Founder Home is useful with real data.
4. Add the revenue pipeline after Manny's actual sales steps are documented.
5. Add one integration or AI workflow at a time, tied to a measurable outcome.

Lane B must not delay paid work in Lane A.

## Named roles and agents

The names ATLAS, Hunter, Micah, David, Amanda, Gideon, Scout, Oracle, Ranger,
Taylor, Mason, Lucky, Solomon, Debbie, and Maynard are preserved as possible
future operating roles. They are **PLANNED** or **IDEA**, not running agents.

A role may be labeled **VERIFIED BUILT** only when all of the following exist:

1. A narrow outcome and explicit trigger.
2. Approved inputs and a real tool or API.
3. Least-privilege credentials and tenant-safe data access.
4. A budget or usage limit.
5. An audit log and understandable output.
6. Failure handling and a way to stop it.
7. Human approval before risky, paid, public, or destructive actions.
8. A successful production test with the result recorded.

## Decisions still required

- Manny's exact three-to-five step sales process from lead to paid client.
- The first Founder Home daily workflow and what counts as an urgent item.
- Which businesses are active now versus parked ideas.
- QTIME's exact paid-pilot scope and success measure.
- Whether personal and family availability belongs in Founder Home. Health or
  family details must not be stored until Manny explicitly approves a private
  scope and access policy; client work must never receive that information.
- Which existing external accounts contain reusable assets versus obsolete
  experiments.

## North star

ATLAS succeeds when Manny completes more revenue-producing work, loses fewer
important details, and spends less time deciding what to do next. Dashboard
count, integration count, and agent count are not success measures.
