# Notes Setup

Notes v1 adds organization-scoped business notes.

Workspace Notes v2 turns notes into shared workspace memory that members can
contribute to.

## What this adds

- `organization_notes`
- RLS-scoped read access for organization members
- RLS-scoped create access for organization members
- RLS-scoped update access for note authors
- RLS-scoped update access for organization owners and admins
- `@Atlas` attention flag support through `attention_requested`
- Super Admin read/create/update support through the current approved Super Admin email

No AI, embeddings, notifications, documents, tasks, CRM, search, tags, or delete
workflow are added.

## Apply the migration

In Supabase SQL Editor, run the SQL in:

```text
supabase/migrations/20260712002000_organization_notes.sql
supabase/migrations/20260712003000_workspace_notes_v2.sql
```

Run it after the workspace foundation and organization context migrations.

## Expected behavior

- Organization members can view notes on `/client`.
- Organization members can create notes from `/client`.
- Members can update their own notes.
- Organization owners/admins can update all notes.
- Notes containing `@Atlas` show an `Atlas attention requested` badge.
- Notes are scoped by organization through Supabase RLS.

The `@Atlas` flag is only a recorded signal in this milestone. It does not send
email, trigger AI, or notify Super Admin users yet.

## Why this matters

Notes become the first lightweight, customer-entered memory layer for Atlas.

This gives Atlas useful business context before any AI retrieval or document storage is introduced.
