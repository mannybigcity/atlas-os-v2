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

The Step 2 foundation now includes organization-scoped 30-day plans, actions,
work for client review, and client decisions. Work-specific communication is
stored as an append-only trail with the sender, date, time, and message. New
message boxes start blank so an old request is never mistaken for a new one.
Client and Super Admin interfaces are connected. QTIME provisioning and the
live cross-tenant isolation test remain gated by
`docs/FOUNDING_PILOT_DEPLOYMENT.md`.

Pre-launch wording requirement:

- On client-facing screens, replace **Deliverables** with **Work for your
  review**.
- When no reviewable work is available, display: **Nothing is ready for your
  review yet.**
- Database and internal implementation names may continue using
  `deliverable` to avoid unnecessary schema changes.
- Keep **Work & messages** together. Client requests and Atlas revisions must
  remain attached to the specific work being discussed.
- Keep unrelated **General messages** available but collapsed by default.
- Keep **Workspace history** available but collapsed by default so it does not
  dominate the client workspace.

Client-facing plain-language review before launch:

- **Offer** -> **What you offer**
- **Positioning** -> **Why customers choose you**
- **Constraints** -> **Challenges and limits** (discuss final wording with
  Manny; **What could get in the way** is another option)
- Keep **Target customer** and **Current goals**.
- Review the rest of the client interface with Manny for corporate, technical,
  or unfamiliar language before inviting real clients.
- Consider **About your business** instead of **Organization context** and
  **Profile progress** instead of **Context preview**.
- In the Lion's Den, client reviews must identify the reviewer in plain
  language: **Approved by [client display name] on [date and time]** or
  **Changes requested by [client display name] on [date and time]**. Use the
  account email as a fallback when no display name is available, and show the
  review note to Atlas Admin.
