# Milestones

## Current status — July 13, 2026

Milestones 0-3 are complete for a controlled pilot. Atlas now has a deployed
Next.js application, Supabase authentication, organization memberships,
tenant-scoped data, production password recovery, threaded conversations,
activity history, and a Super Admin attention inbox.

The immediate milestone is no longer a generic AI briefing. It is a controlled
founding-customer cycle for QTIME Productions. See
`docs/CANONICAL_PRODUCT_BRIEF.md` and `docs/QTIME_PILOT_PLAN.md`.

AI, billing automation, CRM, lead generation, content publishing, and public
self-service onboarding remain deferred until a real QTIME delivery proves
which workflow should be productized.

## Milestone 0: Foundation

Goal: create the product and technical foundation without prematurely adding SaaS complexity.

Scope:

- Product vision
- Architecture direction
- Initial data model thinking
- Minimal Next.js scaffold
- Basic app shell

Out of scope:

- Authentication
- Database
- Billing
- AI integration
- Product workflows
- Third-party integrations

Success criteria:

- The repo is understandable to a new contributor.
- The app can run locally after installing dependencies.
- The next engineering decision is obvious.

## Milestone 1: Clickable Command Center shell

Goal: create a non-functional but convincing shell for the first product wedge.

Scope:

- Landing/dashboard route
- Navigation shell
- Placeholder sections for briefing, priorities, business context, and activity
- No real persistence
- No auth
- No AI

Success criteria:

- We can show the intended user experience.
- We can discuss the product around concrete screens instead of vague ideas.

## Milestone 2: Local data prototype

Goal: validate the core operating loop before adding hosted infrastructure.

Scope:

- Temporary local/mock data
- Business profile inputs
- Notes/context capture
- Manual briefing generation placeholder

Success criteria:

- The product flow feels useful before automation.
- We know which data objects must become permanent.

## Milestone 3: SaaS foundation

Goal: introduce real multi-user infrastructure only after the flow is clear.

Scope:

- Authentication
- Database
- Workspace model
- Membership model
- Environment configuration

Success criteria:

- A real user can create or access a workspace.
- Data is scoped safely to a workspace.

## Milestone 4: AI-assisted briefing

Goal: deliver the first real AI-powered value.

Scope:

- AI provider integration
- Business context summarization
- Daily briefing generation
- Recommended next actions
- Prompt and output logging strategy

Success criteria:

- Atlas can produce a useful briefing from real workspace context.
- The user can understand and trust why Atlas made its recommendations.

## Milestone 5: Revenue foundation

Goal: prepare Atlas to charge customers.

Scope:

- Stripe billing
- Plan limits
- Usage tracking
- Basic onboarding

Success criteria:

- A customer can pay for Atlas.
- Costs and usage are visible enough to protect margins.

## Milestone 6: Controlled QTIME founding pilot

Goal: deliver one useful, repeatable, human-reviewed business outcome to the
first paying customer through the secure Atlas workspace.

Scope:

- Reconcile the original customer promise and payment
- Complete the live cross-tenant isolation test
- Provision a separate QTIME organization and owner account
- Capture a primary 30-day goal and three priorities
- Deliver one reviewed weekly package
- Record customer feedback, delivery time, and direct cost
- Build only the smallest missing workflow proven by the delivery

Out of scope:

- Public signup
- Autonomous agents
- Automated publishing or outreach
- Broad CRM or billing systems
- Claims of AI functionality that does not exist

Success criteria:

- QTIME can access only its own workspace.
- Quincy receives and reviews one real weekly outcome.
- Atlas identifies one workflow worth repeating or productizing.
- No customer data, secrets, or uncontrolled spend are introduced.

### Step 2 implementation status

The local Step 2 foundation now includes organization-scoped 30-day plans,
actions, deliverables, and separate client review records. Client and Super
Admin interfaces are connected. Production migration, smoke testing, QTIME
provisioning, and the live cross-tenant isolation test remain gated by
`docs/FOUNDING_PILOT_DEPLOYMENT.md`.
