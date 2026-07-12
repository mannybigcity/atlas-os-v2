# Data Model

## Current status

No database has been added yet.

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

### Workspace

Represents a business using Atlas.

Likely fields:

- id
- name
- industry
- website
- description
- createdAt
- updatedAt

### Membership

Connects users to workspaces.

Likely fields:

- id
- userId
- workspaceId
- role
- createdAt
- updatedAt

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

- All workspace-owned tables should include `workspaceId`.
- Server-side data access should require a workspace context.
- Users should never be able to query by arbitrary workspace IDs without membership checks.
- AI tools should receive scoped context, not raw unrestricted database access.

## Data modeling bias

Start simple, then harden.

Do not create a complex CRM schema before the Command Center loop proves which objects customers actually use.
