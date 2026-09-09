-- Per-workspace desk settings (first use: remember that the owner cleared the
-- trial sample records so the seed never re-inserts them).
create table if not exists public.organization_desk_settings (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  samples_cleared_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.organization_desk_settings enable row level security;

drop policy if exists "Members can read desk settings" on public.organization_desk_settings;
create policy "Members can read desk settings"
  on public.organization_desk_settings
  for select
  to authenticated
  using (
    public.is_atlas_super_admin()
    or exists (
      select 1
      from public.organization_memberships memberships
      where memberships.organization_id = organization_desk_settings.organization_id
        and memberships.user_id = auth.uid()
    )
  );

drop policy if exists "Members can write desk settings" on public.organization_desk_settings;
create policy "Members can write desk settings"
  on public.organization_desk_settings
  for all
  to authenticated
  using (
    public.is_atlas_super_admin()
    or exists (
      select 1
      from public.organization_memberships memberships
      where memberships.organization_id = organization_desk_settings.organization_id
        and memberships.user_id = auth.uid()
    )
  )
  with check (
    public.is_atlas_super_admin()
    or exists (
      select 1
      from public.organization_memberships memberships
      where memberships.organization_id = organization_desk_settings.organization_id
        and memberships.user_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.organization_desk_settings to authenticated, service_role;

-- Members could insert and read opportunities but never update or delete them,
-- so the Follow-up "Save draft" and "Delete" buttons were silent no-ops for
-- every non-admin customer. Owners need to edit, re-stage, and delete their own
-- prospects.
drop policy if exists "Members can update organization opportunities" on public.organization_opportunities;
create policy "Members can update organization opportunities"
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

drop policy if exists "Members can delete organization opportunities" on public.organization_opportunities;
create policy "Members can delete organization opportunities"
  on public.organization_opportunities
  for delete
  to authenticated
  using (
    public.is_atlas_super_admin()
    or exists (
      select 1
      from public.organization_memberships memberships
      where memberships.organization_id = organization_opportunities.organization_id
        and memberships.user_id = auth.uid()
    )
  );

drop policy if exists "Members can delete organization opportunity events" on public.organization_opportunity_events;
create policy "Members can delete organization opportunity events"
  on public.organization_opportunity_events
  for delete
  to authenticated
  using (
    public.is_atlas_super_admin()
    or exists (
      select 1
      from public.organization_memberships memberships
      where memberships.organization_id = organization_opportunity_events.organization_id
        and memberships.user_id = auth.uid()
    )
  );

drop policy if exists "Members can delete hunter review items" on public.organization_hunter_review_items;
create policy "Members can delete hunter review items"
  on public.organization_hunter_review_items
  for delete
  to authenticated
  using (
    public.is_atlas_super_admin()
    or exists (
      select 1
      from public.organization_memberships memberships
      where memberships.organization_id = organization_hunter_review_items.organization_id
        and memberships.user_id = auth.uid()
    )
  );

-- Sample MICAH cards are the only drafts a member may remove; their own
-- generated cards stay under the existing admin/service paths.
drop policy if exists "Members can delete sample content drafts" on public.organization_content_drafts;
create policy "Members can delete sample content drafts"
  on public.organization_content_drafts
  for delete
  to authenticated
  using (
    coalesce(metadata ->> 'trial_seed', 'false') = 'true'
    and (
      public.is_atlas_super_admin()
      or exists (
        select 1
        from public.organization_memberships memberships
        where memberships.organization_id = organization_content_drafts.organization_id
          and memberships.user_id = auth.uid()
      )
    )
  );

drop policy if exists "Members can delete sample content draft events" on public.organization_content_draft_events;
create policy "Members can delete sample content draft events"
  on public.organization_content_draft_events
  for delete
  to authenticated
  using (
    public.is_atlas_super_admin()
    or exists (
      select 1
      from public.organization_memberships memberships
      where memberships.organization_id = organization_content_draft_events.organization_id
        and memberships.user_id = auth.uid()
    )
  );

grant update, delete on public.organization_opportunities to authenticated;
grant delete on public.organization_opportunity_events to authenticated;
grant delete on public.organization_hunter_review_items to authenticated;
grant delete on public.organization_content_drafts to authenticated;
grant delete on public.organization_content_draft_events to authenticated;
