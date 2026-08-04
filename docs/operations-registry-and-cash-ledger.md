# Operations registry and cash ledger

The migration
`supabase/migrations/20260728100000_operations_registry_and_cash_ledger.sql`
adds the shared operating foundation for Atlas organizations:

- `organization_projects` and `organization_missions` provide a tenant-scoped
  project/mission registry with deterministic status, priority, and source
  fields.
- Project and mission event tables are append-only audit trails populated by
  database triggers.
- `organization_cash_entries` is an append-only cash/payment record. It is a
  ledger, not a payment processor. Settled and refunded entries must carry
  verification status, timestamp, and provenance before they can represent
  verified cash.
- Cash entry events are append-only audit records. Corrections should be new
  adjustment or reversal entries; existing ledger rows are not edited or
  deleted by the application.

All tables enable RLS and scope access by authenticated organization
membership. Projects and missions are readable by members and writable only by
organization owners/admins or the Atlas Super Admin. Cash entries are visible
and insertable only by organization owners/admins or the Atlas Super Admin;
authenticated inserts are limited to unverified entries created by the signed-in
user. Audit tables have read access only. No browser client, provider secret, or
payment credential is introduced by this migration.

## Application boundary

Lion's Den reads the three registry tables server-side and displays explicit
`Needs setup`, `Empty`, and `Needs review` states. It does not create records,
verify payments, call providers, send contact, publish content, or trigger
fulfillment. The query returns setup-required state when the migration is not
available, so an empty result is not presented as a verified zero.

The focused owner surfaces are `/lions-den/missions` for Projects & Missions
and `/lions-den/cash` for the Cash Ledger. Both require the existing Lion's Den
Super Admin guard and use the same read-only query. The HUD allowlist exposes
the `missions` and `cash-ledger` targets for focused deep links from the command
center.

The current implementation deliberately does not add forms or actions for
these tables. A future write workflow must preserve the existing approval gates
and use a reviewed server-side action with validation and audit context.

## Applying and verifying

The migration contains no seed or production-record inserts. It was applied on
2026-07-28 to the authenticated Atlas Supabase project through the approved
Supabase workflow and is recorded live as
`20260728162113_operations_registry_and_cash_ledger`. Read-only verification
confirmed all six tables have zero rows, RLS is enabled, anonymous access is
absent, and the intended authenticated grants and policies are present. The
Supabase CLI is not installed locally; the live application was verified
through the authenticated Supabase database workflow instead.

The application build and migration verification do not prove an authenticated
browser walkthrough. That still requires signing into the local or deployed
Atlas surface with an allowed Super Admin account and confirming Lion's Den
renders the now-live empty ledger and registry states.
