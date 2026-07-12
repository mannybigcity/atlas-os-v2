# Threaded Note Conversations Setup

Threaded Note Conversations v1 replaces shared note-body editing with
immutable, timestamped messages attributed to either a client or Atlas Admin.

## Apply the migration

In the Supabase SQL editor, run the complete contents of:

```text
supabase/migrations/20260712006000_threaded_note_conversations.sql
```

Run the SQL inside the file, not the file path itself.

The migration preserves existing note bodies by converting each one into the
first message in its note thread.

## Behavior

- Organization members can read and reply to their organization's threads.
- Super Admin can read and reply from The Lion's Den.
- Every message has an author label and creation timestamp.
- Atlas replies are labeled `Atlas Admin`; no AI response is implied.
- Messages cannot be edited or deleted.
- A message containing `@Atlas` opens an Attention Inbox request.
- Display names are stored in the signed-in user's Supabase Auth metadata.

No email, realtime subscription, AI, or third-party notification service is
introduced.

