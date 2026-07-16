-- Atlas OS v2 - Private Atlas sales CRM
-- Gives HUNTER and DAVID a real, auditable prospect pipeline while keeping
-- Atlas's own sales data isolated from every client organization.

create table if not exists public.atlas_sales_prospects (
  id uuid primary key default gen_random_uuid(),
  assessment_submission_id uuid unique
    references public.business_assessment_submissions(id) on delete restrict,
  converted_organization_id uuid
    references public.organizations(id) on delete set null,
  business_name text not null
    check (length(btrim(business_name)) between 2 and 250),
  status text not null default 'new'
    check (
      status in (
        'new',
        'researching',
        'review_ready',
        'approved_for_outreach',
        'contacted',
        'replied',
        'qualified',
        'proposal_sent',
        'won',
        'lost',
        'disqualified',
        'duplicate'
      )
    ),
  assigned_role text not null default 'hunter'
    check (assigned_role in ('manny', 'atlas', 'hunter', 'micah', 'david')),
  industry text check (industry is null or length(btrim(industry)) between 2 and 200),
  address_line_1 text
    check (address_line_1 is null or length(btrim(address_line_1)) between 2 and 300),
  city text check (city is null or length(btrim(city)) between 2 and 150),
  region text check (region is null or length(btrim(region)) between 2 and 100),
  postal_code text
    check (postal_code is null or length(btrim(postal_code)) between 2 and 30),
  country_code text not null default 'US'
    check (country_code ~ '^[A-Z]{2}$'),
  website text check (website is null or length(btrim(website)) between 4 and 1000),
  website_domain text
    check (website_domain is null or length(btrim(website_domain)) between 3 and 255),
  contact_name text
    check (contact_name is null or length(btrim(contact_name)) between 2 and 200),
  contact_email text check (
    contact_email is null
    or (
      length(btrim(contact_email)) between 5 and 320
      and position('@' in contact_email) > 1
    )
  ),
  contact_phone text
    check (contact_phone is null or length(btrim(contact_phone)) between 7 and 50),
  social_media text
    check (social_media is null or length(btrim(social_media)) between 3 and 1500),
  contact_basis text not null default 'unknown'
    check (
      contact_basis in (
        'inbound_consent',
        'public_business_contact',
        'referral',
        'prior_relationship',
        'customer',
        'unknown'
      )
    ),
  fit_score smallint check (fit_score is null or fit_score between 0 and 100),
  fit_reason text
    check (fit_reason is null or length(btrim(fit_reason)) between 2 and 2000),
  research_summary text
    check (
      research_summary is null
      or length(btrim(research_summary)) between 2 and 5000
    ),
  next_action text
    check (next_action is null or length(btrim(next_action)) between 2 and 1000),
  next_action_at timestamptz,
  last_contacted_at timestamptz,
  outreach_approved_at timestamptz,
  outreach_approved_by uuid references auth.users(id) on delete restrict,
  approved_channels text[] not null default '{}'::text[]
    check (
      approved_channels <@ array['email', 'phone', 'sms', 'social']::text[]
      and cardinality(approved_channels) <= 4
    ),
  duplicate_of uuid references public.atlas_sales_prospects(id) on delete restrict,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (duplicate_of is null or duplicate_of <> id),
  check (
    (
      status = 'duplicate'
      and duplicate_of is not null
    )
    or (
      status <> 'duplicate'
      and duplicate_of is null
    )
  ),
  check (
    (
      outreach_approved_at is null
      and outreach_approved_by is null
      and cardinality(approved_channels) = 0
    )
    or (
      outreach_approved_at is not null
      and outreach_approved_by is not null
      and cardinality(approved_channels) between 1 and 4
    )
  ),
  check (status <> 'approved_for_outreach' or outreach_approved_at is not null)
);

create index if not exists atlas_sales_prospects_status_created_idx
  on public.atlas_sales_prospects(status, created_at desc);

create index if not exists atlas_sales_prospects_next_action_idx
  on public.atlas_sales_prospects(next_action_at)
  where next_action_at is not null
    and status not in ('won', 'lost', 'disqualified', 'duplicate');

create index if not exists atlas_sales_prospects_email_idx
  on public.atlas_sales_prospects(lower(contact_email))
  where contact_email is not null;

create index if not exists atlas_sales_prospects_domain_idx
  on public.atlas_sales_prospects(lower(website_domain))
  where website_domain is not null;

create table if not exists public.atlas_sales_prospect_sources (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null
    references public.atlas_sales_prospects(id) on delete restrict,
  source_type text not null
    check (
      source_type in (
        'business_assessment',
        'google_places',
        'business_website',
        'social_profile',
        'referral',
        'manual',
        'other'
      )
    ),
  external_id text
    check (external_id is null or length(btrim(external_id)) between 1 and 500),
  source_url text
    check (source_url is null or length(btrim(source_url)) between 4 and 2000),
  search_query text
    check (search_query is null or length(btrim(search_query)) between 2 and 1000),
  retrieved_at timestamptz not null default now(),
  facts jsonb not null default '{}'::jsonb
    check (jsonb_typeof(facts) = 'object'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists atlas_sales_sources_prospect_created_idx
  on public.atlas_sales_prospect_sources(prospect_id, created_at desc);

create unique index if not exists atlas_sales_sources_external_id_uidx
  on public.atlas_sales_prospect_sources(source_type, external_id)
  where external_id is not null;

create table if not exists public.atlas_sales_events (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null
    references public.atlas_sales_prospects(id) on delete restrict,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_role text not null default 'system'
    check (actor_role in ('manny', 'atlas', 'hunter', 'micah', 'david', 'system')),
  event_type text not null
    check (
      event_type in (
        'prospect.created',
        'prospect.updated',
        'research.started',
        'research.completed',
        'status.changed',
        'outreach.approved',
        'outreach.draft_created',
        'contact.attempted',
        'reply.received',
        'follow_up.scheduled',
        'note.added',
        'proposal.sent',
        'suppression.added',
        'suppression.lifted',
        'prospect.converted'
      )
    ),
  channel text
    check (
      channel is null
      or channel in ('email', 'phone', 'sms', 'social', 'website', 'in_person', 'other')
    ),
  direction text
    check (direction is null or direction in ('inbound', 'outbound', 'internal')),
  summary text not null check (length(btrim(summary)) between 2 and 500),
  body text check (body is null or length(btrim(body)) between 1 and 10000),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists atlas_sales_events_prospect_occurred_idx
  on public.atlas_sales_events(prospect_id, occurred_at desc);

create table if not exists public.atlas_contact_suppressions (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid
    references public.atlas_sales_prospects(id) on delete restrict,
  scope_type text not null
    check (scope_type in ('prospect', 'email', 'phone', 'domain')),
  scope_value text not null
    check (length(btrim(scope_value)) between 1 and 500)
    check (
      scope_type <> 'email'
      or position('@' in scope_value) > 1
    )
    check (
      scope_type <> 'phone'
      or length(regexp_replace(scope_value, '[^0-9]', '', 'g')) between 7 and 20
    )
    check (
      scope_type <> 'domain'
      or (
        position('.' in scope_value) > 1
        and position(' ' in btrim(scope_value)) = 0
      )
    ),
  channel text not null
    check (channel in ('all', 'email', 'phone', 'sms', 'social')),
  reason text not null
    check (reason in ('opt_out', 'complaint', 'hard_bounce', 'legal', 'manual', 'other')),
  note text check (note is null or length(btrim(note)) between 2 and 2000),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  lifted_at timestamptz,
  lifted_by uuid references auth.users(id) on delete restrict,
  lift_reason text
    check (lift_reason is null or length(btrim(lift_reason)) between 2 and 1000),
  updated_at timestamptz not null default now(),
  check (
    scope_type <> 'prospect'
    or (
      prospect_id is not null
      and lower(btrim(scope_value)) = lower(prospect_id::text)
    )
  ),
  check (
    (
      lifted_at is null
      and lifted_by is null
      and lift_reason is null
    )
    or (
      lifted_at is not null
      and lifted_by is not null
      and lift_reason is not null
    )
  )
);

create index if not exists atlas_contact_suppressions_prospect_idx
  on public.atlas_contact_suppressions(prospect_id, created_at desc)
  where prospect_id is not null;

create unique index if not exists atlas_contact_suppressions_active_uidx
  on public.atlas_contact_suppressions(scope_type, lower(scope_value), channel)
  where lifted_at is null;

drop trigger if exists atlas_sales_prospects_set_updated_at
  on public.atlas_sales_prospects;
create trigger atlas_sales_prospects_set_updated_at
before update on public.atlas_sales_prospects
for each row execute function public.set_updated_at();

drop trigger if exists atlas_contact_suppressions_set_updated_at
  on public.atlas_contact_suppressions;
create trigger atlas_contact_suppressions_set_updated_at
before update on public.atlas_contact_suppressions
for each row execute function public.set_updated_at();

alter table public.atlas_sales_prospects enable row level security;
alter table public.atlas_sales_prospect_sources enable row level security;
alter table public.atlas_sales_events enable row level security;
alter table public.atlas_contact_suppressions enable row level security;

drop policy if exists "Atlas Admin can read sales prospects"
  on public.atlas_sales_prospects;
create policy "Atlas Admin can read sales prospects"
on public.atlas_sales_prospects
for select
to authenticated
using (public.is_atlas_super_admin());

drop policy if exists "Atlas Admin can create sales prospects"
  on public.atlas_sales_prospects;
create policy "Atlas Admin can create sales prospects"
on public.atlas_sales_prospects
for insert
to authenticated
with check (public.is_atlas_super_admin());

drop policy if exists "Atlas Admin can update sales prospects"
  on public.atlas_sales_prospects;
create policy "Atlas Admin can update sales prospects"
on public.atlas_sales_prospects
for update
to authenticated
using (public.is_atlas_super_admin())
with check (public.is_atlas_super_admin());

drop policy if exists "Atlas Admin can read sales prospect sources"
  on public.atlas_sales_prospect_sources;
create policy "Atlas Admin can read sales prospect sources"
on public.atlas_sales_prospect_sources
for select
to authenticated
using (public.is_atlas_super_admin());

drop policy if exists "Atlas Admin can create sales prospect sources"
  on public.atlas_sales_prospect_sources;
create policy "Atlas Admin can create sales prospect sources"
on public.atlas_sales_prospect_sources
for insert
to authenticated
with check (public.is_atlas_super_admin());

drop policy if exists "Atlas Admin can read sales events"
  on public.atlas_sales_events;
create policy "Atlas Admin can read sales events"
on public.atlas_sales_events
for select
to authenticated
using (public.is_atlas_super_admin());

drop policy if exists "Atlas Admin can create sales events"
  on public.atlas_sales_events;
create policy "Atlas Admin can create sales events"
on public.atlas_sales_events
for insert
to authenticated
with check (public.is_atlas_super_admin());

drop policy if exists "Atlas Admin can read contact suppressions"
  on public.atlas_contact_suppressions;
create policy "Atlas Admin can read contact suppressions"
on public.atlas_contact_suppressions
for select
to authenticated
using (public.is_atlas_super_admin());

drop policy if exists "Atlas Admin can create contact suppressions"
  on public.atlas_contact_suppressions;
create policy "Atlas Admin can create contact suppressions"
on public.atlas_contact_suppressions
for insert
to authenticated
with check (public.is_atlas_super_admin());

drop policy if exists "Atlas Admin can update contact suppressions"
  on public.atlas_contact_suppressions;
create policy "Atlas Admin can update contact suppressions"
on public.atlas_contact_suppressions
for update
to authenticated
using (public.is_atlas_super_admin())
with check (public.is_atlas_super_admin());

-- Explicit grants pair with RLS. No role receives DELETE, and provenance and
-- timeline records intentionally receive no UPDATE permission.
revoke all on table public.atlas_sales_prospects
from public, anon, authenticated;
revoke all on table public.atlas_sales_prospect_sources
from public, anon, authenticated;
revoke all on table public.atlas_sales_events
from public, anon, authenticated;
revoke all on table public.atlas_contact_suppressions
from public, anon, authenticated;

grant select on table public.atlas_sales_prospects to authenticated;
grant insert (
  assessment_submission_id,
  converted_organization_id,
  business_name,
  status,
  assigned_role,
  industry,
  address_line_1,
  city,
  region,
  postal_code,
  country_code,
  website,
  website_domain,
  contact_name,
  contact_email,
  contact_phone,
  social_media,
  contact_basis,
  fit_score,
  fit_reason,
  research_summary,
  next_action,
  next_action_at,
  last_contacted_at,
  duplicate_of,
  created_by,
  updated_by
)
on table public.atlas_sales_prospects
to authenticated;
grant update (
  converted_organization_id,
  business_name,
  status,
  assigned_role,
  industry,
  address_line_1,
  city,
  region,
  postal_code,
  country_code,
  website,
  website_domain,
  contact_name,
  contact_email,
  contact_phone,
  social_media,
  contact_basis,
  fit_score,
  fit_reason,
  research_summary,
  next_action,
  next_action_at,
  last_contacted_at,
  duplicate_of,
  updated_by
)
on table public.atlas_sales_prospects
to authenticated;
grant select, insert on table public.atlas_sales_prospect_sources
to authenticated;
grant select, insert on table public.atlas_sales_events
to authenticated;
grant select on table public.atlas_contact_suppressions
to authenticated;
grant insert (
  prospect_id,
  scope_type,
  scope_value,
  channel,
  reason,
  note,
  created_by
)
on table public.atlas_contact_suppressions
to authenticated;
grant update (lifted_at, lifted_by, lift_reason)
on table public.atlas_contact_suppressions
to authenticated;

-- Status history is database-written so a UI bug cannot silently change the
-- pipeline without leaving an audit record.
create or replace function public.record_atlas_sales_prospect_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.atlas_sales_events (
      prospect_id,
      actor_user_id,
      actor_role,
      event_type,
      direction,
      summary,
      metadata,
      occurred_at
    ) values (
      new.id,
      new.created_by,
      case when new.created_by is null then 'system' else 'manny' end,
      'prospect.created',
      'internal',
      'Prospect added to the Atlas sales pipeline',
      jsonb_build_object('status', new.status),
      new.created_at
    );
  elsif new.status is distinct from old.status then
    insert into public.atlas_sales_events (
      prospect_id,
      actor_user_id,
      actor_role,
      event_type,
      direction,
      summary,
      metadata,
      occurred_at
    ) values (
      new.id,
      new.updated_by,
      case when new.updated_by is null then 'system' else 'manny' end,
      'status.changed',
      'internal',
      'Sales pipeline status changed',
      jsonb_build_object('from', old.status, 'to', new.status),
      new.updated_at
    );
  end if;

  return new;
end;
$$;

drop trigger if exists atlas_sales_prospects_record_activity
  on public.atlas_sales_prospects;
create trigger atlas_sales_prospects_record_activity
after insert or update of status on public.atlas_sales_prospects
for each row execute function public.record_atlas_sales_prospect_activity();

revoke execute on function public.record_atlas_sales_prospect_activity()
from public, anon, authenticated;

-- Adding an active suppression invalidates any earlier outreach approval. A
-- lifted suppression never restores approval automatically; Manny must review
-- and approve the prospect again.
create or replace function public.apply_atlas_contact_suppression()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.lifted_at is not null then
    return new;
  end if;

  insert into public.atlas_sales_events (
    prospect_id,
    actor_user_id,
    actor_role,
    event_type,
    direction,
    summary,
    metadata
  )
  select
    prospects.id,
    new.created_by,
    case when new.created_by is null then 'system' else 'manny' end,
    'suppression.added',
    'internal',
    'Contact suppression added',
    jsonb_build_object(
      'scope_type', new.scope_type,
      'channel', new.channel,
      'reason', new.reason
    )
  from public.atlas_sales_prospects prospects
  where
    (new.prospect_id is null or prospects.id = new.prospect_id)
    and (
      (
        new.scope_type = 'prospect'
        and lower(prospects.id::text) = lower(btrim(new.scope_value))
      )
      or (
        new.scope_type = 'email'
        and lower(btrim(coalesce(prospects.contact_email, ''))) = lower(btrim(new.scope_value))
      )
      or (
        new.scope_type = 'phone'
        and regexp_replace(coalesce(prospects.contact_phone, ''), '[^0-9]', '', 'g')
          = regexp_replace(new.scope_value, '[^0-9]', '', 'g')
      )
      or (
        new.scope_type = 'domain'
        and lower(btrim(coalesce(prospects.website_domain, ''))) = lower(btrim(new.scope_value))
      )
    );

  update public.atlas_sales_prospects prospects
  set
    status = case
      when prospects.status = 'approved_for_outreach' then 'review_ready'
      else prospects.status
    end,
    outreach_approved_at = null,
    outreach_approved_by = null,
    approved_channels = '{}'::text[],
    updated_by = new.created_by
  where prospects.outreach_approved_at is not null
    and (new.channel = 'all' or new.channel = any(prospects.approved_channels))
    and (new.prospect_id is null or prospects.id = new.prospect_id)
    and (
      (
        new.scope_type = 'prospect'
        and lower(prospects.id::text) = lower(btrim(new.scope_value))
      )
      or (
        new.scope_type = 'email'
        and lower(btrim(coalesce(prospects.contact_email, ''))) = lower(btrim(new.scope_value))
      )
      or (
        new.scope_type = 'phone'
        and regexp_replace(coalesce(prospects.contact_phone, ''), '[^0-9]', '', 'g')
          = regexp_replace(new.scope_value, '[^0-9]', '', 'g')
      )
      or (
        new.scope_type = 'domain'
        and lower(btrim(coalesce(prospects.website_domain, ''))) = lower(btrim(new.scope_value))
      )
    );

  return new;
end;
$$;

drop trigger if exists atlas_contact_suppressions_apply
  on public.atlas_contact_suppressions;
create trigger atlas_contact_suppressions_apply
after insert on public.atlas_contact_suppressions
for each row execute function public.apply_atlas_contact_suppression();

revoke execute on function public.apply_atlas_contact_suppression()
from public, anon, authenticated;

-- This is the sole approved database path for granting outreach permission.
-- It locks the prospect, rejects terminal stages or missing destinations, and
-- checks every active prospect/email/phone/domain suppression in the same
-- transaction before recording approval.
create or replace function public.approve_atlas_sales_outreach(
  p_prospect_id uuid,
  p_channels text[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_channels text[];
  v_prospect public.atlas_sales_prospects%rowtype;
begin
  if auth.uid() is null or not public.is_atlas_super_admin() then
    raise exception 'Atlas Super Admin access is required'
      using errcode = '42501';
  end if;

  select coalesce(array_agg(normalized.channel order by normalized.channel), '{}'::text[])
  into v_channels
  from (
    select distinct lower(btrim(value)) as channel
    from unnest(coalesce(p_channels, '{}'::text[])) as requested(value)
    where btrim(value) <> ''
  ) normalized;

  if cardinality(v_channels) = 0
    or not (v_channels <@ array['email', 'phone', 'sms', 'social']::text[])
  then
    raise exception 'At least one supported outreach channel is required'
      using errcode = '22023';
  end if;

  select *
  into v_prospect
  from public.atlas_sales_prospects
  where id = p_prospect_id
  for update;

  if not found then
    raise exception 'Sales prospect was not found'
      using errcode = 'P0002';
  end if;

  if v_prospect.status in ('won', 'lost', 'disqualified', 'duplicate') then
    raise exception 'Outreach cannot be approved for a closed prospect'
      using errcode = '22023';
  end if;

  if 'email' = any(v_channels) and v_prospect.contact_email is null then
    raise exception 'The prospect does not have an email address'
      using errcode = '22023';
  end if;

  if (
    'phone' = any(v_channels)
    or 'sms' = any(v_channels)
  ) and v_prospect.contact_phone is null then
    raise exception 'The prospect does not have a phone number'
      using errcode = '22023';
  end if;

  if 'social' = any(v_channels) and v_prospect.social_media is null then
    raise exception 'The prospect does not have a social media destination'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.atlas_contact_suppressions suppressions
    where suppressions.lifted_at is null
      and (
        suppressions.channel = 'all'
        or suppressions.channel = any(v_channels)
      )
      and (
        (
          suppressions.scope_type = 'prospect'
          and (
            suppressions.prospect_id = v_prospect.id
            or lower(btrim(suppressions.scope_value)) = lower(v_prospect.id::text)
          )
        )
        or (
          suppressions.scope_type = 'email'
          and v_prospect.contact_email is not null
          and lower(btrim(suppressions.scope_value))
            = lower(btrim(v_prospect.contact_email))
        )
        or (
          suppressions.scope_type = 'phone'
          and v_prospect.contact_phone is not null
          and regexp_replace(suppressions.scope_value, '[^0-9]', '', 'g')
            = regexp_replace(v_prospect.contact_phone, '[^0-9]', '', 'g')
        )
        or (
          suppressions.scope_type = 'domain'
          and v_prospect.website_domain is not null
          and lower(btrim(suppressions.scope_value))
            = lower(btrim(v_prospect.website_domain))
        )
      )
  ) then
    raise exception 'Active contact suppression blocks outreach approval'
      using errcode = '42501';
  end if;

  update public.atlas_sales_prospects
  set
    status = case
      when status in ('new', 'researching', 'review_ready')
        then 'approved_for_outreach'
      else status
    end,
    outreach_approved_at = now(),
    outreach_approved_by = auth.uid(),
    approved_channels = v_channels,
    updated_by = auth.uid()
  where id = p_prospect_id;

  insert into public.atlas_sales_events (
    prospect_id,
    actor_user_id,
    actor_role,
    event_type,
    direction,
    summary,
    metadata
  ) values (
    p_prospect_id,
    auth.uid(),
    'manny',
    'outreach.approved',
    'internal',
    'Outreach approved by Atlas Admin',
    jsonb_build_object('channels', to_jsonb(v_channels))
  );

  return p_prospect_id;
end;
$$;

revoke execute on function public.approve_atlas_sales_outreach(uuid, text[])
from public, anon;
grant execute on function public.approve_atlas_sales_outreach(uuid, text[])
to authenticated;

-- Public assessments are immutable intake evidence. A narrow trigger creates
-- or updates the corresponding private prospect; it does not expose CRM data
-- to the submitting user.
create or replace function public.capture_business_assessment_sales_prospect()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prospect_id uuid;
  v_status text;
  v_website_domain text;
begin
  v_status := case new.status
    when 'new' then 'new'
    when 'contacted' then 'contacted'
    when 'qualified' then 'qualified'
    when 'not_a_fit' then 'disqualified'
    when 'converted' then 'won'
    else 'new'
  end;

  v_website_domain := case
    when new.website is null then null
    else nullif(
      lower(
        regexp_replace(
          split_part(
            regexp_replace(new.website, '^https?://', '', 'i'),
            '/',
            1
          ),
          '^www\.',
          '',
          'i'
        )
      ),
      ''
    )
  end;

  if tg_op = 'UPDATE' then
    update public.atlas_sales_prospects
    set
      status = v_status,
      updated_by = auth.uid()
    where assessment_submission_id = new.id
      and duplicate_of is null
      and outreach_approved_at is null;

    return new;
  end if;

  insert into public.atlas_sales_prospects (
    assessment_submission_id,
    business_name,
    status,
    assigned_role,
    website,
    website_domain,
    contact_name,
    contact_email,
    contact_phone,
    social_media,
    contact_basis,
    created_at,
    updated_at
  ) values (
    new.id,
    new.business_name,
    v_status,
    'hunter',
    new.website,
    v_website_domain,
    new.contact_name,
    lower(btrim(new.contact_email)),
    new.contact_phone,
    new.social_media,
    'inbound_consent',
    new.created_at,
    new.updated_at
  )
  on conflict (assessment_submission_id) do nothing
  returning id into v_prospect_id;

  if v_prospect_id is null then
    select id
    into v_prospect_id
    from public.atlas_sales_prospects
    where assessment_submission_id = new.id;
  end if;

  insert into public.atlas_sales_prospect_sources (
    prospect_id,
    source_type,
    external_id,
    retrieved_at,
    facts,
    created_at
  ) values (
    v_prospect_id,
    'business_assessment',
    new.id::text,
    new.created_at,
    jsonb_build_object(
      'business_description', new.business_description,
      'ideal_customer', new.ideal_customer,
      'customer_sources', new.customer_sources,
      'biggest_challenge', new.biggest_challenge,
      'ninety_day_goal', new.ninety_day_goal,
      'evaluation_areas', new.evaluation_areas,
      'business_size', new.business_size,
      'ai_tools', new.ai_tools,
      'improvement_timing', new.improvement_timing,
      'consent_to_contact', new.consent_to_contact,
      'source', new.source
    ),
    new.created_at
  )
  on conflict (source_type, external_id)
    where external_id is not null
  do nothing;

  return new;
end;
$$;

drop trigger if exists business_assessments_capture_sales_prospect
  on public.business_assessment_submissions;
create trigger business_assessments_capture_sales_prospect
after insert or update of status on public.business_assessment_submissions
for each row execute function public.capture_business_assessment_sales_prospect();

revoke execute on function public.capture_business_assessment_sales_prospect()
from public, anon, authenticated;

-- Preserve existing assessment leads when this migration is first applied.
insert into public.atlas_sales_prospects (
  assessment_submission_id,
  business_name,
  status,
  assigned_role,
  website,
  website_domain,
  contact_name,
  contact_email,
  contact_phone,
  social_media,
  contact_basis,
  created_at,
  updated_at
)
select
  assessments.id,
  assessments.business_name,
  case assessments.status
    when 'new' then 'new'
    when 'contacted' then 'contacted'
    when 'qualified' then 'qualified'
    when 'not_a_fit' then 'disqualified'
    when 'converted' then 'won'
    else 'new'
  end,
  'hunter',
  assessments.website,
  case
    when assessments.website is null then null
    else nullif(
      lower(
        regexp_replace(
          split_part(
            regexp_replace(assessments.website, '^https?://', '', 'i'),
            '/',
            1
          ),
          '^www\.',
          '',
          'i'
        )
      ),
      ''
    )
  end,
  assessments.contact_name,
  lower(btrim(assessments.contact_email)),
  assessments.contact_phone,
  assessments.social_media,
  'inbound_consent',
  assessments.created_at,
  assessments.updated_at
from public.business_assessment_submissions assessments
on conflict (assessment_submission_id) do nothing;

insert into public.atlas_sales_prospect_sources (
  prospect_id,
  source_type,
  external_id,
  retrieved_at,
  facts,
  created_at
)
select
  prospects.id,
  'business_assessment',
  assessments.id::text,
  assessments.created_at,
  jsonb_build_object(
    'business_description', assessments.business_description,
    'ideal_customer', assessments.ideal_customer,
    'customer_sources', assessments.customer_sources,
    'biggest_challenge', assessments.biggest_challenge,
    'ninety_day_goal', assessments.ninety_day_goal,
    'evaluation_areas', assessments.evaluation_areas,
    'business_size', assessments.business_size,
    'ai_tools', assessments.ai_tools,
    'improvement_timing', assessments.improvement_timing,
    'consent_to_contact', assessments.consent_to_contact,
    'source', assessments.source
  ),
  assessments.created_at
from public.business_assessment_submissions assessments
join public.atlas_sales_prospects prospects
  on prospects.assessment_submission_id = assessments.id
on conflict (source_type, external_id)
  where external_id is not null
do nothing;

-- No delete policy or DELETE grant is provided for any CRM table. Prospect,
-- provenance, suppression, and contact history are retained for auditability.
