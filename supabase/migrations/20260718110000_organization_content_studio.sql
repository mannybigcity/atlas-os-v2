-- Atlas OS v2 - Organization Content Studio
-- Gives each organization a private queue of social images and post drafts.
-- Draft creation is separate from publishing: clients must review every item.

create table if not exists public.organization_content_drafts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  draft_date date not null default current_date,
  slot text not null check (length(btrim(slot)) between 1 and 80),
  campaign text not null check (length(btrim(campaign)) between 2 and 160),
  title text not null check (length(btrim(title)) between 2 and 160),
  headline text not null check (length(btrim(headline)) between 2 and 120),
  supporting_text text check (
    supporting_text is null or length(btrim(supporting_text)) between 2 and 240
  ),
  caption text not null check (length(btrim(caption)) between 10 and 2200),
  call_to_action text check (
    call_to_action is null or length(btrim(call_to_action)) between 2 and 240
  ),
  platforms text[] not null default array['instagram', 'facebook']::text[]
    check (
      cardinality(platforms) between 1 and 6
      and platforms <@ array[
        'instagram', 'facebook', 'tiktok', 'youtube', 'linkedin', 'x'
      ]::text[]
    ),
  visual_style text not null default 'atlas_branded'
    check (visual_style in (
      'atlas_branded', 'broadcast', 'street_festival', 'premium_editorial'
    )),
  image_url text,
  image_svg text,
  status text not null default 'ready_for_review'
    check (status in (
      'draft', 'ready_for_review', 'approved', 'changes_requested',
      'scheduled', 'published', 'archived'
    )),
  generated_by text not null default 'micah'
    check (generated_by in ('atlas', 'micah', 'manual')),
  generation_source text not null default 'manual'
    check (generation_source in ('manual', 'scheduled_openai')),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, draft_date, slot)
);

create index if not exists organization_content_drafts_org_created_idx
  on public.organization_content_drafts(organization_id, created_at desc);

create index if not exists organization_content_drafts_review_queue_idx
  on public.organization_content_drafts(organization_id, status, created_at desc);

create table if not exists public.organization_content_draft_events (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.organization_content_drafts(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_type text not null
    check (event_type in ('created', 'approved', 'changes_requested', 'scheduled', 'published')),
  note text check (note is null or length(btrim(note)) <= 2000),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_label text not null check (length(btrim(actor_label)) between 2 and 100),
  created_at timestamptz not null default now()
);

create index if not exists organization_content_events_draft_created_idx
  on public.organization_content_draft_events(draft_id, created_at, id);

create table if not exists public.organization_content_automations (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  enabled boolean not null default false,
  timezone text not null default 'America/Chicago'
    check (length(btrim(timezone)) between 3 and 80),
  daily_limit smallint not null default 1 check (daily_limit between 1 and 3),
  monthly_budget_microusd bigint not null default 2000000
    check (monthly_budget_microusd between 0 and 100000000),
  brief text check (brief is null or length(btrim(brief)) <= 4000),
  last_successful_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_content_run_claims (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  run_date date not null,
  status text not null default 'running'
    check (status in ('running', 'succeeded', 'failed', 'budget_blocked')),
  error_code text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (organization_id, run_date)
);

drop trigger if exists organization_content_drafts_set_updated_at
  on public.organization_content_drafts;
create trigger organization_content_drafts_set_updated_at
before update on public.organization_content_drafts
for each row execute function public.set_updated_at();

drop trigger if exists organization_content_automations_set_updated_at
  on public.organization_content_automations;
create trigger organization_content_automations_set_updated_at
before update on public.organization_content_automations
for each row execute function public.set_updated_at();

alter table public.organization_content_drafts enable row level security;
alter table public.organization_content_draft_events enable row level security;
alter table public.organization_content_automations enable row level security;
alter table public.organization_content_run_claims enable row level security;

drop policy if exists "Members can read content drafts"
  on public.organization_content_drafts;
create policy "Members can read content drafts"
on public.organization_content_drafts for select to authenticated
using (
  public.is_atlas_super_admin()
  or (
    status <> 'draft'
    and exists (
      select 1 from public.organization_memberships memberships
      where memberships.organization_id = organization_content_drafts.organization_id
        and memberships.user_id = auth.uid()
    )
  )
);

drop policy if exists "Members can read content draft events"
  on public.organization_content_draft_events;
create policy "Members can read content draft events"
on public.organization_content_draft_events for select to authenticated
using (
  public.is_atlas_super_admin()
  or exists (
    select 1 from public.organization_memberships memberships
    where memberships.organization_id = organization_content_draft_events.organization_id
      and memberships.user_id = auth.uid()
  )
);

drop policy if exists "Members can read content automation status"
  on public.organization_content_automations;
create policy "Members can read content automation status"
on public.organization_content_automations for select to authenticated
using (
  public.is_atlas_super_admin()
  or exists (
    select 1 from public.organization_memberships memberships
    where memberships.organization_id = organization_content_automations.organization_id
      and memberships.user_id = auth.uid()
  )
);

-- Only Atlas Super Admin and trusted service-role automation may create or
-- change drafts. Clients review through the function below.
drop policy if exists "Atlas Admin can manage content drafts"
  on public.organization_content_drafts;
create policy "Atlas Admin can manage content drafts"
on public.organization_content_drafts for all to authenticated
using (public.is_atlas_super_admin())
with check (public.is_atlas_super_admin());

drop policy if exists "Atlas Admin can manage content draft events"
  on public.organization_content_draft_events;
create policy "Atlas Admin can manage content draft events"
on public.organization_content_draft_events for all to authenticated
using (public.is_atlas_super_admin())
with check (public.is_atlas_super_admin());

drop policy if exists "Atlas Admin can manage content automations"
  on public.organization_content_automations;
create policy "Atlas Admin can manage content automations"
on public.organization_content_automations for all to authenticated
using (public.is_atlas_super_admin())
with check (public.is_atlas_super_admin());

revoke all on table public.organization_content_drafts,
  public.organization_content_draft_events,
  public.organization_content_automations,
  public.organization_content_run_claims
from public, anon, authenticated;

grant select on table public.organization_content_drafts,
  public.organization_content_draft_events,
  public.organization_content_automations
to authenticated;

grant insert, update on table public.organization_content_drafts,
  public.organization_content_draft_events,
  public.organization_content_automations
to authenticated;

create or replace function public.submit_content_draft_review(
  p_draft_id uuid,
  p_organization_id uuid,
  p_decision text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_display_name text;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;

  if p_decision not in ('approved', 'changes_requested') then
    raise exception 'Invalid review decision';
  end if;

  if not exists (
    select 1 from public.organization_memberships memberships
    where memberships.organization_id = p_organization_id
      and memberships.user_id = auth.uid()
      and memberships.role in ('owner', 'admin')
  ) then
    raise exception 'Owner or admin access is required' using errcode = '42501';
  end if;

  select status into v_status
  from public.organization_content_drafts
  where id = p_draft_id and organization_id = p_organization_id
  for update;

  if v_status is null or v_status not in ('ready_for_review', 'changes_requested') then
    raise exception 'Content draft is not available for review';
  end if;

  select coalesce(
    nullif(btrim(users.raw_user_meta_data ->> 'display_name'), ''),
    nullif(btrim(users.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(users.email), ''),
    'Client reviewer'
  ) into v_display_name
  from auth.users users
  where users.id = auth.uid();

  update public.organization_content_drafts
  set status = p_decision
  where id = p_draft_id and organization_id = p_organization_id;

  insert into public.organization_content_draft_events (
    draft_id, organization_id, event_type, note,
    actor_user_id, actor_label
  ) values (
    p_draft_id, p_organization_id, p_decision,
    nullif(btrim(coalesce(p_note, '')), ''),
    auth.uid(), coalesce(v_display_name, 'Client reviewer')
  );
end;
$$;

revoke execute on function public.submit_content_draft_review(uuid, uuid, text, text)
from public, anon;
grant execute on function public.submit_content_draft_review(uuid, uuid, text, text)
to authenticated;

-- Seed QTime with the three researched Roll'n Wars concepts prepared by Atlas.
insert into public.organization_content_drafts (
  organization_id, draft_date, slot, campaign, title, headline,
  supporting_text, caption, call_to_action, platforms, visual_style,
  image_url, status, generated_by, generation_source, metadata
)
select
  organizations.id,
  date '2026-07-18',
  seed.slot,
  'Roll''n Wars',
  seed.title,
  seed.headline,
  seed.supporting_text,
  seed.caption,
  seed.call_to_action,
  array['instagram', 'facebook']::text[],
  seed.visual_style,
  seed.image_url,
  'ready_for_review',
  'micah',
  'manual',
  jsonb_build_object(
    'concept', true,
    'research_based', true,
    'requires_event_details', true
  )
from public.organizations organizations
cross join (
  values
    (
      'rolln-wars-concept-1',
      'Concept 1 - Broadcast Energy',
      'WHO''S TAKING THE CROWN?',
      'Food truck battle series - Denver, Colorado',
      E'Denver, who''s taking the crown?\n\nRoll''n Wars brings local food trucks together for a head-to-head culinary battle built for flavor, competition, and community.\n\nFeatured matchup: [Food Truck A] vs. [Food Truck B]\n[Date] - [Time] - [Venue]\n\nFollow QTime Productions for the matchup announcement, judges, and event details.\n\n#RollnWars #DenverFoodTrucks #DenverEvents #QTimeProductions #ColoradoFoodScene',
      'Follow for the matchup announcement and event details.',
      'broadcast',
      '/client-content/qtime-productions/rolln-wars-concept-1-broadcast.png'
    ),
    (
      'rolln-wars-concept-2',
      'Concept 2 - Street Festival',
      'DENVER''S FOOD TRUCK BATTLE',
      'Real food trucks. Real competition. One champion.',
      E'Two food trucks. One battle. Denver gets the final show.\n\nRoll''n Wars is QTime Productions'' competition series spotlighting local culinary businesses through entertainment-driven content and live community energy.\n\nNext battle: [Food Truck A] vs. [Food Truck B]\n[Date] - [Time] - [Venue]\n\nTag the food truck you want to see in a future battle.\n\n#RollnWars #FoodTruckBattle #DenverEats #ColoradoSmallBusiness #QTimeProductions',
      'Tag a food truck you want to see compete.',
      'street_festival',
      '/client-content/qtime-productions/rolln-wars-concept-2-street-festival.png'
    ),
    (
      'rolln-wars-concept-3',
      'Concept 3 - Premium Editorial',
      'WHERE FLAVOR MEETS COMPETITION',
      'A QTime Productions original series',
      E'Competition creates a moment. Storytelling creates a brand.\n\nRoll''n Wars gives food trucks a stage to showcase the people, personality, and flavor behind their business while audiences get a competition worth following.\n\nUpcoming feature: [Food Truck A] vs. [Food Truck B]\n[Date] - [Time] - [Venue]\n\nWant your food truck or brand featured? Send QTime Productions a message.\n\n#RollnWars #QTimeProductions #FoodTruckMarketing #DenverFoodScene #BrandStorytelling',
      'Message QTime Productions to be featured.',
      'premium_editorial',
      '/client-content/qtime-productions/rolln-wars-concept-3-premium-editorial.png'
    )
) as seed(slot, title, headline, supporting_text, caption, call_to_action, visual_style, image_url)
where organizations.slug = 'qtime-productions'
on conflict (organization_id, draft_date, slot) do update
set
  title = excluded.title,
  headline = excluded.headline,
  supporting_text = excluded.supporting_text,
  caption = excluded.caption,
  call_to_action = excluded.call_to_action,
  visual_style = excluded.visual_style,
  image_url = excluded.image_url,
  updated_at = now();

insert into public.organization_content_draft_events (
  draft_id, organization_id, event_type, note, actor_label
)
select
  drafts.id,
  drafts.organization_id,
  'created',
  'Atlas prepared this researched Roll''n Wars concept for client review.',
  'Atlas / MICAH'
from public.organization_content_drafts drafts
join public.organizations organizations on organizations.id = drafts.organization_id
where organizations.slug = 'qtime-productions'
  and drafts.draft_date = date '2026-07-18'
  and drafts.slot like 'rolln-wars-concept-%'
  and not exists (
    select 1 from public.organization_content_draft_events events
    where events.draft_id = drafts.id and events.event_type = 'created'
  );

insert into public.organization_content_automations (
  organization_id, enabled, timezone, daily_limit,
  monthly_budget_microusd, brief
)
select
  organizations.id,
  true,
  'America/Denver',
  1,
  2000000,
  'Prepare one practical social post draft each day for QTime Productions. Prioritize Roll''n Wars, Food4Thought Network, sponsorship outreach, behind-the-scenes production, and useful audience engagement. Never invent event dates, venues, sponsors, pricing, testimonials, or performance claims.'
from public.organizations organizations
where organizations.slug = 'qtime-productions'
on conflict (organization_id) do update
set
  enabled = excluded.enabled,
  timezone = excluded.timezone,
  daily_limit = excluded.daily_limit,
  monthly_budget_microusd = excluded.monthly_budget_microusd,
  brief = excluded.brief,
  updated_at = now();

-- Content and event history are retained. No client delete policy is provided.
