# Organization Context Setup

Organization Context v1 adds one editable business profile per organization.

## What this adds

- `business_profiles`
- RLS-scoped read access for organization members
- RLS-scoped create/update access for organization owners and admins
- Super Admin read/create/update support through the current approved Super Admin email

No AI, embeddings, documents, tasks, CRM, or agents are added.

## Apply the migration

In Supabase SQL Editor, run the SQL in:

```text
supabase/migrations/20260712001000_business_profiles.sql
```

Run it after the workspace foundation migration.

## Expected behavior

- Organization members can view business context on `/client`.
- Organization owners/admins can update the business profile from `/client`.
- Members who are not owners/admins see the profile as read-only.
- If no profile exists, Atlas shows an honest empty state.

## Why this matters

This table becomes the first structured memory layer for Atlas.

Future AI features should read from approved organization context instead of guessing from a blank prompt.
