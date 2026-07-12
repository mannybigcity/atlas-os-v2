# Activity Events Setup

Activity Events v1 adds an organization-scoped, read-only timeline to the
client workspace.

## Apply the migration

In the Supabase SQL editor, open and run the complete contents of:

```text
supabase/migrations/20260712004000_activity_events.sql
```

Run the SQL inside the file, not the file path itself.

## What it records

- Workspace note created
- Workspace note updated
- `@Atlas` attention requested on a note
- Business profile updated

Events are created by database triggers. The client application has no direct
insert, update, or delete policy for activity events.

## Access rules

- Organization members can read events for their own organizations.
- The Atlas Super Admin can read organization events.
- Events cannot be edited or deleted through the application.

Existing notes and business-profile changes are not backfilled. The timeline
starts recording after this migration is applied.

