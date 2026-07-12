# Notes Setup

Notes v1 adds organization-scoped business notes.

## What this adds

- `organization_notes`
- RLS-scoped read access for organization members
- RLS-scoped create/update access for organization owners and admins
- Super Admin read/create/update support through the current approved Super Admin email

No AI, embeddings, documents, tasks, CRM, search, tags, or delete workflow are added.

## Apply the migration

In Supabase SQL Editor, run the SQL in:

```text
supabase/migrations/20260712002000_organization_notes.sql
```

Run it after the workspace foundation and organization context migrations.

## Expected behavior

- Organization members can view notes on `/client`.
- Organization owners/admins can create and update notes from `/client`.
- Members who are not owners/admins see notes as read-only.
- Notes are scoped by organization through Supabase RLS.

## Why this matters

Notes become the first lightweight, customer-entered memory layer for Atlas.

This gives Atlas useful business context before any AI retrieval or document storage is introduced.
