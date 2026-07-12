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

Defined in:

```text
supabase/migrations/20260712001000_business_profiles.sql
```

Current fields:

- organization_id
- offer
- target_customer
- positioning
- current_goals
- constraints
- created_at
- updated_at

### ActivityEvent

Captures meaningful business activity over time.

Defined in:

```text
supabase/migrations/20260712004000_activity_events.sql
```

Current fields:

- id
- organization_id
- actor_user_id
- event_type
- title
- entity_type
- entity_id
- metadata
- occurred_at
- created_at

Current events cover note creation, note updates, `@Atlas` attention requests,
and business-profile updates. Events are append-only and become part of Atlas's
business memory without requiring AI spend.

### AttentionRequest

Tracks active `@Atlas` requests for the Super Admin inbox.

Defined in:

```text
supabase/migrations/20260712005000_attention_inbox.sql
```

Current fields:

- id
- organization_id
- note_id
- requested_by
- status
- requested_at
- acknowledged_at
- acknowledged_by
- resolved_at
- resolved_by
- created_at
- updated_at

Only Super Admin can read or triage this inbox. Organization members create and
close requests indirectly by adding or removing `@Atlas` from a shared note.

### NoteMessage

Stores immutable replies within a note conversation.

Defined in:

```text
supabase/migrations/20260712006000_threaded_note_conversations.sql
```

Current fields:

- id
- organization_id
- note_id
- author_user_id
- author_kind
- author_display_name
- body
- attention_requested
- created_at

Existing note bodies are migrated into first messages. New messages are
timestamped, cannot be edited or deleted, and identify human Atlas responses as
`Atlas Admin`.

### OrganizationNote

Stores lightweight organization-scoped business notes.

Defined in:

```text
supabase/migrations/20260712002000_organization_notes.sql
supabase/migrations/20260712003000_workspace_notes_v2.sql
```

Current fields:

- id
- organization_id
- title
- body
- created_by
- attention_requested
- created_at
- updated_at

Current access rules:

- Organization members can read notes.
- Organization members can create notes.
- Note authors can update their own notes.
- Organization owners/admins can update all notes.
- Notes containing `@Atlas` are flagged with `attention_requested`.
- Delete is intentionally not implemented yet.

## Later entities

These should not be implemented yet, but they are likely future primitives:

- Contact
- Company
- Opportunity
- Task
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
- Organization members can read their business profile.
- Organization owners/admins can create and update their business profile.
- Organization members can read organization notes.
- Organization members can create organization notes.
- Note authors can update their own organization notes.
- Organization owners/admins can update all organization notes.
- Organization members can read their organization's activity events.
- Activity events are written by database triggers and are append-only.
- Delete policies are intentionally not created yet.

## Data modeling bias

Start simple, then harden.

Do not create a complex CRM schema before the Command Center loop proves which objects customers actually use.
