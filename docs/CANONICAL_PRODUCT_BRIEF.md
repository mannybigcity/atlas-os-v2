# Atlas OS Canonical Product Brief

Updated July 14, 2026. This brief distills the Atlas master handoff packet and
the verified state of Atlas OS v2. When an older prototype, note, or plan
conflicts with this document, pause and resolve the conflict before building.

The detailed private-founder direction and evidence ledger live in
`docs/ATLAS_FOUNDER_OS_VISION.md`.

## Product and business boundaries

**Atlas For Entrepreneurs** is Manny's public-facing business and client
acquisition website. Its job is to explain the service, earn trust, collect
qualified leads, and sell approved offers.

**ATLAS OS** is Manny's private founder operating system. It is intended to help
Manny organize and build his businesses, client work, apps, products, and new
ideas from one secure command center. ATLAS is the name and identity of the
system; Codex is one of the development tools used to build it.

**The client workspace** is a limited surface inside ATLAS OS. Approved clients
may see only their own organization, goals, actions, work for review, messages,
and business profile. It is not the whole founder operating system.

These three surfaces must not be treated as interchangeable. In particular,
the ATLAS OS homepage must not become the Atlas For Entrepreneurs marketing
website, and a client login must never expose Manny's private founder workspace.

## Product direction

ATLAS OS should help Manny understand what matters, decide what to do next,
turn ideas into real projects, and follow through without keeping every
business in his head.

The long-term vision includes project planning, app creation, business idea
development, assessment, recommendations, tasks, customer follow-up, content,
growth opportunities, progress tracking, and carefully controlled AI
assistance. Those are directions, not claims about the current product.

Named ATLAS roles or agents may eventually support specialized workflows, but
each one must correspond to real code, permissions, tools, logs, cost controls,
and human approval. A name or prompt alone is not a running agent.

The near-term product is narrower: a human-assisted command center that turns
approved business context into a small number of reviewed priorities,
deliverables, and next actions.

## Current truth

Atlas OS v2 is the only canonical application and repository.

Verified foundation:

- Next.js application deployed through Netlify from the private GitHub repo
- Supabase email/password authentication and production password recovery
- Public, client, and Super Admin routes separated by purpose and access
- Organization and membership-based tenant model
- Organization-scoped business profile, activity, notes, and conversations
- Row Level Security on active client-owned tables
- The Lion's Den attention inbox and human Atlas Admin replies
- Resend-backed custom SMTP with a verified sending domain
- Production password policy and Security Advisor hardening

Not yet delivered as product capabilities:

- A private Founder Home and cross-business command center
- Founder-wide projects, ideas, products, tasks, and revenue pipeline
- Self-service customer onboarding
- CRM, lead-generation, or follow-up automation
- Content planning and publishing workflows
- Assessments and generated action plans
- Billing automation
- AI retrieval, recommendations, agents, or autonomous background work
- Formal public-launch operations such as managed backups, monitoring, legal
  documents, incident response, and mature admin role management

Atlas now has verified organization-scoped plans, actions, work review,
client decisions, reviewer identity, message history, and tenant hardening.
QTIME has a separate organization and owner membership. The controlled pilot
may proceed after Quincy completes login and access-isolation verification. It
is not ready for self-service public signup or claims of autonomous AI work.

## Operating rules

1. Revenue and useful customer outcomes outrank architecture expansion.
2. Build in small milestones tied to a real customer need.
3. Keep one canonical application and one authentication authority.
4. Protect tenant isolation and secrets before entering customer data.
5. Describe only capabilities that work today.
6. Keep a human in review and approval loops.
7. Do not run uncontrolled autonomous agents or background model loops.
8. Keep infrastructure and AI spending visible and capped.
9. Use plain language in the product and customer communication.
10. Never store passwords, payment-card data, government IDs, or unrelated
    confidential records in Atlas.

## Legacy asset policy

Old Atlas applications, DigitalOcean runtimes, Paperclip/Hermes experiments,
static dashboards, prompts, and exports are research material, not production
dependencies.

The original Atlas source repository is
`https://github.com/mannybigcity/atlas-os`. Manny provided this identity on
July 14, 2026. It remains an unaudited **OLD PROTOTYPE**. Atlas OS v2 remains
the only canonical application and production repository.

Before reusing a legacy asset:

1. Inventory what it contains and why it might matter.
2. Exclude credentials, authentication code, logs, duplicates, generated
   filler, and unverified customer data.
3. Extract requirements, useful copy, approved business context, or visual
   references.
4. Reimplement only the smallest proven need inside Atlas OS v2.
5. Never reconnect an old authentication system or agent runtime directly to
   production.

## First customer

QTIME Productions is Atlas's first paying customer and should be treated as a
founding pilot. Known contact information:

- Preferred name: Quincy
- Full name reported in the July 10 Claude export: Quincy Mitchell
- Email: `quincy@qtimeproductions.com`
- Company: QTIME Productions

QTP LLC doing business as QTIME Productions is the customer organization.
Food4Thought Network and Roll'n Wars are projects or brands operated under
QTIME; neither should replace the organization name in Atlas. The relationship
between the older "Food for Thought" materials and Food4Thought Network still
needs Quincy's confirmation.

The assessment deck advertised $49/month. Puter's July 14 evidence handoff
reports that a $50 payment was recorded on June 29, 2026, but no recurring term,
contract length, guaranteed result, or delivery date was found. Treat $50 as a
reported payment fact and locate the receipt or payment record before treating
the commercial terms as verified.

No promise should be inferred from the old feature inventory. Before customer
access is sent, Atlas must document what Quincy understood the payment to buy,
whether it was recurring, what he has already received, and his expected
timeline.

## Single next objective

Deliver one clearly defined, paid, repeatable outcome for QTIME through the
secure Atlas foundation. The proposed pilot is defined in
`docs/QTIME_PILOT_PLAN.md` and must be confirmed with Manny before it is
promised to Quincy.
