-- Atlas OS v2 - Organization opportunity pipeline
-- Gives each client workspace a private HUNTER/DAVID pipeline for prospects,
-- sponsors, partners, and follow-up targets.

create table if not exists public.organization_opportunities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (length(btrim(name)) between 2 and 220),
  opportunity_type text not null
    check (opportunity_type in (
      'sponsor', 'food_truck', 'venue', 'partner', 'media', 'customer', 'other'
    )),
  stage text not null default 'researching'
    check (stage in (
      'researching', 'qualified', 'needs_client_input', 'ready_for_follow_up',
      'follow_up_queued', 'contacted', 'responded', 'won', 'lost', 'archived'
    )),
  fit_score smallint not null default 0 check (fit_score between 0 and 100),
  owner_role text not null default 'hunter'
    check (owner_role in ('atlas', 'hunter', 'micah', 'david', 'client', 'manual')),
  source_label text check (
    source_label is null or length(btrim(source_label)) between 2 and 180
  ),
  source_url text check (
    source_url is null or length(btrim(source_url)) between 8 and 2000
  ),
  contact_name text check (
    contact_name is null or length(btrim(contact_name)) between 2 and 180
  ),
  contact_email text check (
    contact_email is null
    or (
      length(btrim(contact_email)) between 5 and 320
      and position('@' in contact_email) > 1
    )
  ),
  contact_phone text check (
    contact_phone is null or length(btrim(contact_phone)) between 7 and 80
  ),
  contact_social text check (
    contact_social is null or length(btrim(contact_social)) between 2 and 500
  ),
  research_summary text not null
    check (length(btrim(research_summary)) between 10 and 3000),
  fit_reason text check (
    fit_reason is null or length(btrim(fit_reason)) between 10 and 3000
  ),
  next_action text check (
    next_action is null or length(btrim(next_action)) between 5 and 1200
  ),
  next_action_due date,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name, opportunity_type)
);

create index if not exists organization_opportunities_org_stage_idx
  on public.organization_opportunities(organization_id, stage, fit_score desc);

create index if not exists organization_opportunities_org_due_idx
  on public.organization_opportunities(organization_id, next_action_due, fit_score desc)
  where next_action_due is not null;

create table if not exists public.organization_opportunity_events (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.organization_opportunities(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_type text not null
    check (event_type in (
      'created', 'research_added', 'next_action_set', 'follow_up_queued',
      'contacted', 'reply_received', 'won', 'lost', 'note_added'
    )),
  actor_role text not null default 'hunter'
    check (actor_role in ('atlas', 'hunter', 'micah', 'david', 'client', 'manual')),
  summary text not null check (length(btrim(summary)) between 5 and 500),
  body text check (body is null or length(btrim(body)) <= 3000),
  created_at timestamptz not null default now()
);

create index if not exists organization_opportunity_events_opportunity_created_idx
  on public.organization_opportunity_events(opportunity_id, created_at, id);

drop trigger if exists organization_opportunities_set_updated_at
  on public.organization_opportunities;
create trigger organization_opportunities_set_updated_at
before update on public.organization_opportunities
for each row execute function public.set_updated_at();

alter table public.organization_opportunities enable row level security;
alter table public.organization_opportunity_events enable row level security;

drop policy if exists "Members can read organization opportunities"
  on public.organization_opportunities;
create policy "Members can read organization opportunities"
on public.organization_opportunities for select to authenticated
using (
  public.is_atlas_super_admin()
  or exists (
    select 1 from public.organization_memberships memberships
    where memberships.organization_id = organization_opportunities.organization_id
      and memberships.user_id = auth.uid()
  )
);

drop policy if exists "Members can read organization opportunity events"
  on public.organization_opportunity_events;
create policy "Members can read organization opportunity events"
on public.organization_opportunity_events for select to authenticated
using (
  public.is_atlas_super_admin()
  or exists (
    select 1 from public.organization_memberships memberships
    where memberships.organization_id = organization_opportunity_events.organization_id
      and memberships.user_id = auth.uid()
  )
);

drop policy if exists "Atlas Admin can manage organization opportunities"
  on public.organization_opportunities;
create policy "Atlas Admin can manage organization opportunities"
on public.organization_opportunities for all to authenticated
using (public.is_atlas_super_admin())
with check (public.is_atlas_super_admin());

drop policy if exists "Atlas Admin can manage organization opportunity events"
  on public.organization_opportunity_events;
create policy "Atlas Admin can manage organization opportunity events"
on public.organization_opportunity_events for all to authenticated
using (public.is_atlas_super_admin())
with check (public.is_atlas_super_admin());

revoke all on table public.organization_opportunities,
  public.organization_opportunity_events
from public, anon, authenticated;

grant select on table public.organization_opportunities,
  public.organization_opportunity_events
to authenticated;

grant insert, update on table public.organization_opportunities,
  public.organization_opportunity_events
to authenticated;

-- Seed QTime with first-pass HUNTER opportunities from the client context.
insert into public.organization_opportunities (
  organization_id,
  name,
  opportunity_type,
  stage,
  fit_score,
  owner_role,
  source_label,
  contact_name,
  contact_email,
  contact_phone,
  contact_social,
  research_summary,
  fit_reason,
  next_action,
  next_action_due,
  metadata
)
select
  organizations.id,
  seed.name,
  seed.opportunity_type,
  seed.stage,
  seed.fit_score,
  seed.owner_role,
  seed.source_label,
  seed.contact_name,
  seed.contact_email,
  seed.contact_phone,
  seed.contact_social,
  seed.research_summary,
  seed.fit_reason,
  seed.next_action,
  current_date + seed.days_until_due,
  jsonb_build_object(
    'seeded_for_client_review', true,
    'requires_client_confirmation', true,
    'no_outreach_sent', true
  )
from public.organizations organizations
cross join (
  values
    (
      'US Foods sponsorship follow-up',
      'sponsor',
      'ready_for_follow_up',
      92::smallint,
      'david',
      'QTime business profile / warm lead',
      null,
      null,
      null,
      null,
      'Warm sponsor opportunity mentioned in QTime''s business context. US Foods fits the Roll''n Wars audience because food-service distributors already serve restaurants, food trucks, and culinary operators.',
      'Strong brand-to-audience fit: Roll''n Wars can create sponsor visibility around local food businesses, competitions, and community events.',
      'Confirm the right contact, sponsor package angle, and any prior conversation details. Then DAVID can prepare a short follow-up sequence for QTime approval.',
      2
    ),
    (
      'Denver food truck matchup shortlist',
      'food_truck',
      'researching',
      88::smallint,
      'hunter',
      'QTime Roll''n Wars opportunity',
      null,
      null,
      null,
      null,
      'HUNTER should build a shortlist of Denver and Colorado food trucks that have active social pages, distinct food categories, and enough audience energy to make a Roll''n Wars matchup interesting.',
      'Food trucks are both content subjects and potential recurring partners. The right matchup gives QTime content, audience growth, and sponsor inventory.',
      'Pick a theme for the next 10-prospect search: barbecue vs wings, tacos vs burgers, dessert trucks, or chef-led specialty trucks.',
      3
    ),
    (
      'New Terrain Brewing venue partner',
      'venue',
      'needs_client_input',
      80::smallint,
      'hunter',
      'Roll''n Wars event context',
      null,
      null,
      null,
      null,
      'Potential venue partner for Roll''n Wars-style food truck events. Needs confirmation from QTime before Atlas treats it as an active relationship or outreach target.',
      'A venue partner can help with location, audience draw, food truck participation, and repeatable event programming.',
      'Confirm whether this is an existing venue relationship, a past event location, or a target venue before any follow-up draft is prepared.',
      4
    ),
    (
      'Colorado culinary sponsor list',
      'sponsor',
      'researching',
      76::smallint,
      'hunter',
      'QTime sponsor growth goal',
      null,
      null,
      null,
      null,
      'A sponsor list should include local and regional food-service brands, beverage companies, kitchen equipment suppliers, distributors, and community business groups aligned with food truck and restaurant audiences.',
      'These sponsors may value local culinary visibility but need a simple, specific package instead of a vague sponsorship ask.',
      'Define the first sponsor offer: title sponsor, matchup sponsor, judge table sponsor, or episode segment sponsor.',
      6
    ),
    (
      'Food4Thought launch partners',
      'media',
      'qualified',
      74::smallint,
      'atlas',
      'Food4Thought Season 1 goal',
      'Chef J-Roc',
      null,
      null,
      null,
      'Food4Thought Network Season 1 can create partner opportunities around chefs, restaurants, recipes, kitchen brands, and audience-building clips for YouTube, TikTok, and Instagram.',
      'The show creates recurring media assets QTime can use to attract guests, sponsors, and cross-promotion partners.',
      'Confirm the Season 1 publishing schedule, target platforms, episode list, and the first guest/sponsor angle.',
      5
    )
) as seed(
  name,
  opportunity_type,
  stage,
  fit_score,
  owner_role,
  source_label,
  contact_name,
  contact_email,
  contact_phone,
  contact_social,
  research_summary,
  fit_reason,
  next_action,
  days_until_due
)
where organizations.slug = 'qtime-productions'
on conflict (organization_id, name, opportunity_type) do update
set
  stage = excluded.stage,
  fit_score = excluded.fit_score,
  owner_role = excluded.owner_role,
  source_label = excluded.source_label,
  contact_name = excluded.contact_name,
  contact_email = excluded.contact_email,
  contact_phone = excluded.contact_phone,
  contact_social = excluded.contact_social,
  research_summary = excluded.research_summary,
  fit_reason = excluded.fit_reason,
  next_action = excluded.next_action,
  next_action_due = excluded.next_action_due,
  metadata = excluded.metadata,
  updated_at = now();

insert into public.organization_opportunity_events (
  opportunity_id,
  organization_id,
  event_type,
  actor_role,
  summary,
  body
)
select
  opportunities.id,
  opportunities.organization_id,
  'created',
  'hunter',
  'HUNTER published this opportunity for QTime review.',
  'This is first-pass research based on QTime''s business context. No automatic outreach has been sent.'
from public.organization_opportunities opportunities
join public.organizations organizations on organizations.id = opportunities.organization_id
where organizations.slug = 'qtime-productions'
  and opportunities.name in (
    'US Foods sponsorship follow-up',
    'Denver food truck matchup shortlist',
    'New Terrain Brewing venue partner',
    'Colorado culinary sponsor list',
    'Food4Thought launch partners'
  )
  and not exists (
    select 1
    from public.organization_opportunity_events events
    where events.opportunity_id = opportunities.id
      and events.event_type = 'created'
  );

-- Prospect history is retained. No client delete policy is provided.
