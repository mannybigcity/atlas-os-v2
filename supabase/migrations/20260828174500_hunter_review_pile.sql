-- Persist HUNTER Google Places finds in an organization-scoped REVIEW PILE.
-- Results are not CRM prospects until the owner accepts them.
-- Does not send email, SMS, or phone contact.

create table if not exists public.organization_hunter_review_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  place_id text not null
    check (length(btrim(place_id)) between 1 and 256),
  name text not null
    check (length(btrim(name)) between 1 and 250),
  formatted_address text
    check (
      formatted_address is null
      or length(btrim(formatted_address)) between 1 and 500
    ),
  google_maps_url text
    check (
      google_maps_url is null
      or length(btrim(google_maps_url)) between 8 and 2000
    ),
  website_url text
    check (
      website_url is null
      or length(btrim(website_url)) between 8 and 2000
    ),
  primary_type text
    check (
      primary_type is null
      or length(btrim(primary_type)) between 1 and 120
    ),
  business_status text
    check (
      business_status is null
      or length(btrim(business_status)) between 1 and 80
    ),
  search_query text not null
    check (length(btrim(search_query)) between 2 and 1000),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'dismissed')),
  accepted_opportunity_id uuid
    references public.organization_opportunities(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, place_id),
  check (
    (
      status = 'accepted'
      and accepted_opportunity_id is not null
    )
    or (
      status <> 'accepted'
      and accepted_opportunity_id is null
    )
  )
);

create index if not exists organization_hunter_review_org_status_idx
  on public.organization_hunter_review_items(organization_id, status, created_at desc);

drop trigger if exists organization_hunter_review_items_set_updated_at
  on public.organization_hunter_review_items;
create trigger organization_hunter_review_items_set_updated_at
before update on public.organization_hunter_review_items
for each row execute function public.set_updated_at();

alter table public.organization_hunter_review_items enable row level security;

drop policy if exists "Members can read hunter review items"
  on public.organization_hunter_review_items;
create policy "Members can read hunter review items"
on public.organization_hunter_review_items
for select
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

drop policy if exists "Members can insert hunter review items"
  on public.organization_hunter_review_items;
create policy "Members can insert hunter review items"
on public.organization_hunter_review_items
for insert
to authenticated
with check (
  created_by = auth.uid()
  and (
    public.is_atlas_super_admin()
    or exists (
      select 1
      from public.organization_memberships memberships
      where memberships.organization_id = organization_hunter_review_items.organization_id
        and memberships.user_id = auth.uid()
    )
  )
);

drop policy if exists "Members can update hunter review items"
  on public.organization_hunter_review_items;
create policy "Members can update hunter review items"
on public.organization_hunter_review_items
for update
to authenticated
using (
  public.is_atlas_super_admin()
  or exists (
    select 1
    from public.organization_memberships memberships
    where memberships.organization_id = organization_hunter_review_items.organization_id
      and memberships.user_id = auth.uid()
  )
)
with check (
  public.is_atlas_super_admin()
  or exists (
    select 1
    from public.organization_memberships memberships
    where memberships.organization_id = organization_hunter_review_items.organization_id
      and memberships.user_id = auth.uid()
  )
);

revoke all on table public.organization_hunter_review_items
from public, anon, authenticated;
grant select, insert, update on table public.organization_hunter_review_items
to authenticated;

-- Members may accept a reviewed HUNTER find into their private prospect pipeline.
-- They still cannot send outreach from this table.
drop policy if exists "Members can accept hunter prospects"
  on public.organization_opportunities;
create policy "Members can accept hunter prospects"
on public.organization_opportunities
for insert
to authenticated
with check (
  public.is_atlas_super_admin()
  or exists (
    select 1
    from public.organization_memberships memberships
    where memberships.organization_id = organization_opportunities.organization_id
      and memberships.user_id = auth.uid()
  )
);

drop policy if exists "Members can log hunter prospect events"
  on public.organization_opportunity_events;
create policy "Members can log hunter prospect events"
on public.organization_opportunity_events
for insert
to authenticated
with check (
  public.is_atlas_super_admin()
  or exists (
    select 1
    from public.organization_memberships memberships
    where memberships.organization_id = organization_opportunity_events.organization_id
      and memberships.user_id = auth.uid()
  )
);

-- Count the existing 20-search UTC-day cap without inventing a new quota.
create or replace function public.get_hunter_places_search_count_today()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.atlas_agent_runs
  where role = 'hunter'
    and workflow = 'google_places_preview'
    and provider = 'google_places'
    and status = 'succeeded'
    and occurred_at >= (date_trunc('day', timezone('utc', now())) at time zone 'utc');
$$;

revoke all on function public.get_hunter_places_search_count_today() from public, anon;
grant execute on function public.get_hunter_places_search_count_today() to authenticated;

create or replace function public.record_hunter_places_search(
  p_organization_id uuid,
  p_query text,
  p_result_count integer,
  p_radius_miles integer,
  p_status text,
  p_error_code text,
  p_places_content_persisted boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_used integer;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if p_status not in ('succeeded', 'failed', 'blocked') then
    return jsonb_build_object('ok', false, 'error', 'invalid_status');
  end if;

  if p_organization_id is null then
    if not public.is_atlas_super_admin() then
      return jsonb_build_object('ok', false, 'error', 'not_authorized');
    end if;
  elsif not public.is_atlas_super_admin() then
    if not exists (
      select 1
      from public.organization_memberships memberships
      where memberships.organization_id = p_organization_id
        and memberships.user_id = v_user
    ) then
      return jsonb_build_object('ok', false, 'error', 'not_authorized');
    end if;
  end if;

  v_used := public.get_hunter_places_search_count_today();

  insert into public.atlas_agent_runs (
    organization_id,
    role,
    workflow,
    provider,
    status,
    request_units,
    result_count,
    initiated_by,
    estimated_cost_microusd,
    error_code,
    metadata
  ) values (
    p_organization_id,
    'hunter',
    'google_places_preview',
    'google_places',
    p_status,
    case when p_status = 'blocked' then 0 else 1 end,
    greatest(coalesce(p_result_count, 0), 0),
    v_user,
    case when p_status = 'succeeded' then 32000 else 0 end,
    nullif(btrim(coalesce(p_error_code, '')), ''),
    jsonb_build_object(
      'query', coalesce(p_query, ''),
      'max_results', 10,
      'radius_miles', p_radius_miles,
      'places_content_persisted', coalesce(p_places_content_persisted, false),
      'list_price_exposure_after_free_cap_usd', 0.032
    )
  );

  return jsonb_build_object('ok', true, 'used', v_used + case when p_status = 'succeeded' then 1 else 0 end);
end;
$$;

revoke all on function public.record_hunter_places_search(uuid, text, integer, integer, text, text, boolean)
from public, anon;
grant execute on function public.record_hunter_places_search(uuid, text, integer, integer, text, text, boolean)
to authenticated;
