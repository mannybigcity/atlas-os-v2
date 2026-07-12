# Milestones

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
