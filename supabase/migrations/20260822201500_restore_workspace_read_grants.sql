-- RLS policies define which authenticated users may see these tenant records.
-- The table-level SELECT grants are also required for PostgREST to evaluate
-- those policies. Without them, authenticated CRM requests fail before RLS.

grant select on table public.organizations to authenticated;
grant select on table public.organization_memberships to authenticated;
