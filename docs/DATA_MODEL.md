# Data Model

## Current status

The minimal workspace foundation has been defined in:

```text
supabase/migrations/20260712000000_workspace_foundation.sql
```

Apply it manually in the Supabase SQL editor before expecting organization data
to appear in the app.

This document captures the intended domain model so we can design intentionally when persistence is introduced.

## Core principle

Every durable business record should belong to a workspace.

The workspace is the tenant boundary. It represents a business, not just an individual user.

## Initial entities, future milestone

### User

Represents a person who can sign in.

Likely fields:

- id
- name
- email
- createdAt
- updatedAt

### Organization / Workspace

Represents a business using Atlas.

Current fields:

- id
- name
- slug
- created_at
- updated_at

### OrganizationMembership

Connects users to organizations/workspaces.

Current fields:

- id
- organization_id
- user_id
- role
- created_at
- updated_at

Initial roles:

- owner
- admin
- member

### BusinessProfile

Stores the strategic context Atlas needs to understand the business.

Likely fields:

- id
- workspaceId
- offer
- targetCustomer
- positioning
- currentGoals
- constraints
- createdAt
- updatedAt

### ActivityEvent

Captures meaningful business activity over time.

Likely fields:

- id
- workspaceId
- actorUserId
- type
- title
- body
- metadata
- occurredAt
- createdAt

This will eventually become part of Atlas's business memory.

## Later entities

These should not be implemented yet, but they are likely future primitives:

- Contact
- Company
- Opportunity
- Task
- Note
- Document
- Decision
- AIConversation
- AIMessage
- AIGeneratedArtifact

## Multi-tenant safety

When persistence is introduced:

- All workspace-owned tables should include `organization_id`.
- Server-side data access should require organization context.
- Users should never be able to query by arbitrary organization IDs without membership checks.
- AI tools should receive scoped context, not raw unrestricted database access.

Current RLS baseline:

- Organization members can read their own organizations.
- Users can read their own memberships.
- The approved Super Admin email can read organization and membership shells.
- Insert/update/delete policies are intentionally not created yet.

## Data modeling bias

Start simple, then harden.

Do not create a complex CRM schema before the Command Center loop proves which objects customers actually use.
