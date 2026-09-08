-- Atlas OS v2 - 7-day trial leads become real prospects
--
-- Every AFE trial signup already lands in atlas_trial_profiles (name, business,
-- email, PHONE, business type, growth goal) and gets its own trial workspace.
-- What was missing: a record in the founder's own CRM (the Prospects desk of
-- the atlas-for-entrepreneurs operator workspace) that the founder can edit,
-- call, text, email, and move through stages.
--
-- The app links a trial to its prospect through
--   organization_opportunities.metadata ->> 'trial_user_id'
-- so no new table is needed. This migration adds:
--   1. a lookup index for that link
--   2. an UPDATE policy so workspace members (not only Atlas Admin) can edit
--      contact details, log a touch, set a next action, or mark won/lost on
--      prospects inside their own workspace. Delete stays closed: prospect
--      history is retained.

create index if not exists organization_opportunities_trial_user_idx
  on public.organization_opportunities (organization_id, (metadata ->> 'trial_user_id'))
  where metadata ? 'trial_user_id';

drop policy if exists "Members can update their prospects"
  on public.organization_opportunities;
create policy "Members can update their prospects"
on public.organization_opportunities
for update
to authenticated
using (
  public.is_atlas_super_admin()
  or exists (
    select 1
    from public.organization_memberships memberships
    where memberships.organization_id = organization_opportunities.organization_id
      and memberships.user_id = auth.uid()
  )
)
with check (
  public.is_atlas_super_admin()
  or exists (
    select 1
    from public.organization_memberships memberships
    where memberships.organization_id = organization_opportunities.organization_id
      and memberships.user_id = auth.uid()
  )
);

-- The service role links trial signups to prospects at provisioning time and
-- needs to read trial profiles + the operator desk organization to do so.
grant select on table public.atlas_trial_profiles to service_role;
grant select on table public.organizations to service_role;
grant select, insert, update on table public.organization_opportunities to service_role;
grant select, insert on table public.organization_opportunity_events to service_role;
