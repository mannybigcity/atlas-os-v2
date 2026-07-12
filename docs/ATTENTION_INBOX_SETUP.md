# Super Admin Attention Inbox Setup

The Attention Inbox centralizes active `@Atlas` note requests inside The
Lion's Den. It introduces no email, SMS, push-notification, or AI costs.

## Apply the migration

In the Supabase SQL editor, open and run the complete contents of:

```text
supabase/migrations/20260712005000_attention_inbox.sql
```

Run the SQL inside the file, not the file path itself.

The migration backfills any notes that are currently flagged for Atlas
attention.

## Inbox behavior

- A new `@Atlas` mention creates an open request.
- Super Admin can acknowledge the request.
- Super Admin can resolve the request.
- Resolving clears the note's attention badge.
- Removing `@Atlas` from a note also closes its active request.
- Only the approved Atlas Super Admin can query or update the inbox.

Author display names and timestamped replies are intentionally deferred to the
Threaded Note Conversations milestone.

