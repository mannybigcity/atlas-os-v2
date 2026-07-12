# Workspace Data Setup

This milestone adds the minimum database foundation for Atlas organizations and memberships.

## What this adds

- `organizations`
- `organization_memberships`
- Row Level Security for both tables
- A read-only Super Admin RLS allowance for `info@atlasforentrepreneurs.com`

No organization onboarding, billing, CRM, AI, document storage, or service-role key is added.

## Apply the migration

In Supabase:

1. Open the Atlas project.
2. Go to **SQL Editor**.
3. Run the SQL in:

```text
supabase/migrations/20260712000000_workspace_foundation.sql
```

## Seed a test organization

After applying the migration, create an organization and memberships manually.

Example:

```sql
insert into public.organizations (name, slug)
values ('Atlas Test Organization', 'atlas-test')
returning id;
```

Copy the returned organization `id`.

Find user IDs:

```sql
select id, email
from auth.users
where email in (
  'info@atlasforentrepreneurs.com',
  'mannyanddeleana@gmail.com'
);
```

Insert memberships:

```sql
insert into public.organization_memberships (organization_id, user_id, role)
values
  ('ORGANIZATION_ID_HERE', 'ADMIN_USER_ID_HERE', 'owner'),
  ('ORGANIZATION_ID_HERE', 'CLIENT_USER_ID_HERE', 'member')
on conflict (organization_id, user_id) do update
set role = excluded.role;
```

## Expected behavior

- A logged-in client sees only organizations they belong to on `/client`.
- The Super Admin sees a read-only organization list on `/lions-den`.
- Non-admin users remain blocked from `/lions-den`.

## Important security note

The application still uses `ATLAS_SUPER_ADMIN_EMAILS` for route authorization.

The database RLS migration also grants read access to:

```text
info@atlasforentrepreneurs.com
```

Keep those values aligned until Atlas has database-backed platform roles.
