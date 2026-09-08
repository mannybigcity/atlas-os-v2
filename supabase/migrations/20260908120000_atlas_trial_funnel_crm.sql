-- Atlas OS v2 - Seven-day trial funnel wired into the Atlas CRM
--
-- Before this migration a trial signup only created a row in
-- public.atlas_trial_profiles. That row was readable by the trial owner alone,
-- had no relationship to public.atlas_sales_prospects, and exposed no admin
-- path, so a trial could be listed but never worked: no record, no phone or
-- email action, no follow-up task, no conversion.
--
-- This migration makes every trial a first-class CRM prospect:
--   1. links prospects to the trial auth user (atlas_sales_prospects.trial_user_id)
--   2. records trial provenance (source_type 'trial_signup') and trial events
--   3. creates or links the prospect automatically when a trial profile is
--      created, and backfills existing trials
--   4. lets the Atlas Super Admin read trial profiles and exposes admin RPCs to
--      list the trial roster, extend a trial, convert a trial into a client
--      organization, and repair a missing CRM link

-- ---------------------------------------------------------------------------
-- 1. Schema additions
-- ---------------------------------------------------------------------------

alter table public.atlas_sales_prospects
  add column if not exists trial_user_id uuid
    references auth.users(id) on delete set null;

create unique index if not exists atlas_sales_prospects_trial_user_uidx
  on public.atlas_sales_prospects(trial_user_id)
  where trial_user_id is not null;

alter table public.atlas_trial_profiles
  add column if not exists converted_organization_id uuid
    references public.organizations(id) on delete set null,
  add column if not exists converted_at timestamptz,
  add column if not exists extension_count integer not null default 0
    check (extension_count between 0 and 50);

alter table public.atlas_trial_profiles
  drop constraint if exists atlas_trial_profiles_conversion_pair_check;
alter table public.atlas_trial_profiles
  add constraint atlas_trial_profiles_conversion_pair_check check (
    (converted_organization_id is null and converted_at is null)
    or (converted_organization_id is not null and converted_at is not null)
  );

drop trigger if exists atlas_trial_profiles_set_updated_at on public.atlas_trial_profiles;
create trigger atlas_trial_profiles_set_updated_at
before update on public.atlas_trial_profiles
for each row execute function public.set_updated_at();

-- Provenance: a trial signup is its own evidence type.
alter table public.atlas_sales_prospect_sources
  drop constraint if exists atlas_sales_prospect_sources_source_type_check;
alter table public.atlas_sales_prospect_sources
  add constraint atlas_sales_prospect_sources_source_type_check check (
    source_type in (
      'business_assessment',
      'trial_signup',
      'google_places',
      'business_website',
      'social_profile',
      'referral',
      'manual',
      'other'
    )
  );

-- Timeline: trial lifecycle events live next to every other CRM event.
alter table public.atlas_sales_events
  drop constraint if exists atlas_sales_events_event_type_check;
alter table public.atlas_sales_events
  add constraint atlas_sales_events_event_type_check check (
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
      'prospect.converted',
      'trial.started',
      'trial.extended',
      'trial.converted'
    )
  );

-- ---------------------------------------------------------------------------
-- 2. Super Admin visibility on trial profiles (owner policies stay as-is)
-- ---------------------------------------------------------------------------

drop policy if exists "Atlas Admin can read trial profiles" on public.atlas_trial_profiles;
create policy "Atlas Admin can read trial profiles"
on public.atlas_trial_profiles
for select
to authenticated
using (public.is_atlas_super_admin());

-- ---------------------------------------------------------------------------
-- 3. Trial -> prospect sync (trigger + backfill + repair)
-- ---------------------------------------------------------------------------

-- Creates the CRM prospect for a trial, or links the trial to an existing
-- prospect that already carries the same email (for example an assessment lead
-- who later started a trial). Idempotent: safe to call repeatedly.
create or replace function public.sync_atlas_trial_prospect(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.atlas_trial_profiles%rowtype;
  v_prospect_id uuid;
  v_linked_existing boolean := false;
begin
  select * into v_profile
  from public.atlas_trial_profiles
  where user_id = p_user_id;

  if not found then
    return null;
  end if;

  select id into v_prospect_id
  from public.atlas_sales_prospects
  where trial_user_id = p_user_id;

  if v_prospect_id is null then
    select id into v_prospect_id
    from public.atlas_sales_prospects
    where trial_user_id is null
      and contact_email is not null
      and lower(btrim(contact_email)) = lower(btrim(v_profile.email))
      and status not in ('won', 'lost', 'duplicate')
    order by created_at desc
    limit 1;

    if v_prospect_id is not null then
      v_linked_existing := true;

      update public.atlas_sales_prospects
      set
        trial_user_id = p_user_id,
        contact_name = coalesce(contact_name, v_profile.full_name),
        contact_phone = coalesce(contact_phone, v_profile.phone),
        industry = coalesce(industry, v_profile.business_type),
        contact_basis = 'inbound_consent',
        assigned_role = case when assigned_role = 'hunter' then 'david' else assigned_role end,
        status = case
          when status in ('new', 'researching', 'review_ready', 'approved_for_outreach', 'contacted', 'replied')
            then 'qualified'
          else status
        end,
        next_action = coalesce(next_action, 'Welcome call: confirm goals and walk through the trial workspace'),
        next_action_at = coalesce(next_action_at, v_profile.trial_started_at + interval '1 day'),
        updated_by = null
      where id = v_prospect_id;
    end if;
  end if;

  if v_prospect_id is null then
    insert into public.atlas_sales_prospects (
      trial_user_id,
      business_name,
      status,
      assigned_role,
      industry,
      contact_name,
      contact_email,
      contact_phone,
      contact_basis,
      fit_reason,
      next_action,
      next_action_at,
      created_at,
      updated_at
    ) values (
      p_user_id,
      v_profile.business_name,
      'qualified',
      'david',
      v_profile.business_type,
      v_profile.full_name,
      lower(btrim(v_profile.email)),
      v_profile.phone,
      'inbound_consent',
      'Started a 7-day trial and accepted the terms. Goal: ' || left(v_profile.primary_growth_goal, 400),
      'Welcome call: confirm goals and walk through the trial workspace',
      v_profile.trial_started_at + interval '1 day',
      v_profile.trial_started_at,
      v_profile.trial_started_at
    )
    returning id into v_prospect_id;
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
    'trial_signup',
    p_user_id::text,
    v_profile.trial_started_at,
    jsonb_build_object(
      'full_name', v_profile.full_name,
      'business_name', v_profile.business_name,
      'business_type', v_profile.business_type,
      'primary_growth_goal', v_profile.primary_growth_goal,
      'trial_started_at', v_profile.trial_started_at,
      'trial_ends_at', v_profile.trial_ends_at,
      'terms_accepted_at', v_profile.terms_accepted_at,
      'privacy_accepted_at', v_profile.privacy_accepted_at,
      'linked_existing_prospect', v_linked_existing
    ),
    v_profile.trial_started_at
  )
  on conflict (source_type, external_id) where external_id is not null
  do nothing;

  if not exists (
    select 1 from public.atlas_sales_events
    where prospect_id = v_prospect_id and event_type = 'trial.started'
  ) then
    insert into public.atlas_sales_events (
      prospect_id,
      actor_role,
      event_type,
      direction,
      summary,
      body,
      metadata,
      occurred_at
    ) values (
      v_prospect_id,
      'system',
      'trial.started',
      'inbound',
      '7-day trial started',
      v_profile.primary_growth_goal,
      jsonb_build_object(
        'trial_started_at', v_profile.trial_started_at,
        'trial_ends_at', v_profile.trial_ends_at,
        'linked_existing_prospect', v_linked_existing
      ),
      v_profile.trial_started_at
    );
  end if;

  return v_prospect_id;
end;
$$;

revoke execute on function public.sync_atlas_trial_prospect(uuid)
from public, anon, authenticated;

create or replace function public.capture_trial_profile_sales_prospect()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_atlas_trial_prospect(new.user_id);
  return new;
end;
$$;

drop trigger if exists atlas_trial_profiles_capture_sales_prospect
  on public.atlas_trial_profiles;
create trigger atlas_trial_profiles_capture_sales_prospect
after insert on public.atlas_trial_profiles
for each row execute function public.capture_trial_profile_sales_prospect();

revoke execute on function public.capture_trial_profile_sales_prospect()
from public, anon, authenticated;

-- Backfill every trial that already exists.
select public.sync_atlas_trial_prospect(user_id)
from public.atlas_trial_profiles;

-- Admin repair button: re-run the sync for one trial.
create or replace function public.atlas_admin_sync_trial_prospect(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_atlas_super_admin() then
    raise exception 'Atlas Super Admin access is required' using errcode = '42501';
  end if;

  return public.sync_atlas_trial_prospect(p_user_id);
end;
$$;

revoke all on function public.atlas_admin_sync_trial_prospect(uuid) from public, anon;
grant execute on function public.atlas_admin_sync_trial_prospect(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Trial roster for the Super Admin desk
-- ---------------------------------------------------------------------------

create or replace function public.get_atlas_trial_roster()
returns table (
  user_id uuid,
  full_name text,
  business_name text,
  email text,
  phone text,
  business_type text,
  primary_growth_goal text,
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  extension_count integer,
  converted_organization_id uuid,
  converted_organization_slug text,
  converted_at timestamptz,
  email_confirmed_at timestamptz,
  last_sign_in_at timestamptz,
  prospect_id uuid,
  prospect_status text,
  prospect_next_action text,
  prospect_next_action_at timestamptz,
  prospect_last_contacted_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null or not public.is_atlas_super_admin() then
    raise exception 'Atlas Super Admin access is required' using errcode = '42501';
  end if;

  return query
  select
    trials.user_id,
    trials.full_name,
    trials.business_name,
    lower(trials.email)::text,
    trials.phone,
    trials.business_type,
    trials.primary_growth_goal,
    trials.trial_started_at,
    trials.trial_ends_at,
    trials.extension_count,
    trials.converted_organization_id,
    organizations.slug,
    trials.converted_at,
    users.email_confirmed_at,
    users.last_sign_in_at,
    prospects.id,
    prospects.status,
    prospects.next_action,
    prospects.next_action_at,
    prospects.last_contacted_at
  from public.atlas_trial_profiles trials
  left join auth.users users on users.id = trials.user_id
  left join public.organizations organizations on organizations.id = trials.converted_organization_id
  left join public.atlas_sales_prospects prospects on prospects.trial_user_id = trials.user_id
  order by trials.trial_started_at desc;
end;
$$;

revoke all on function public.get_atlas_trial_roster() from public, anon;
grant execute on function public.get_atlas_trial_roster() to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Extend a trial
-- ---------------------------------------------------------------------------

create or replace function public.extend_atlas_trial(p_user_id uuid, p_days integer)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.atlas_trial_profiles%rowtype;
  v_new_end timestamptz;
  v_prospect_id uuid;
begin
  if auth.uid() is null or not public.is_atlas_super_admin() then
    raise exception 'Atlas Super Admin access is required' using errcode = '42501';
  end if;

  if p_days is null or p_days < 1 or p_days > 30 then
    raise exception 'Trial extensions must be between 1 and 30 days' using errcode = '22023';
  end if;

  select * into v_profile
  from public.atlas_trial_profiles
  where user_id = p_user_id
  for update;

  if not found then
    raise exception 'Trial was not found' using errcode = 'P0002';
  end if;

  if v_profile.converted_organization_id is not null then
    raise exception 'This trial already converted to a client' using errcode = '22023';
  end if;

  v_new_end := greatest(v_profile.trial_ends_at, now()) + make_interval(days => p_days);

  update public.atlas_trial_profiles
  set trial_ends_at = v_new_end,
      extension_count = extension_count + 1
  where user_id = p_user_id;

  v_prospect_id := public.sync_atlas_trial_prospect(p_user_id);

  if v_prospect_id is not null then
    insert into public.atlas_sales_events (
      prospect_id, actor_user_id, actor_role, event_type, direction, summary, metadata
    ) values (
      v_prospect_id,
      auth.uid(),
      'manny',
      'trial.extended',
      'internal',
      format('Trial extended by %s day%s', p_days, case when p_days = 1 then '' else 's' end),
      jsonb_build_object('days', p_days, 'previous_end', v_profile.trial_ends_at, 'new_end', v_new_end)
    );
  end if;

  return v_new_end;
end;
$$;

revoke all on function public.extend_atlas_trial(uuid, integer) from public, anon;
grant execute on function public.extend_atlas_trial(uuid, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Convert a trial into a paying client organization
-- ---------------------------------------------------------------------------

create or replace function public.convert_atlas_trial_to_client(
  p_user_id uuid,
  p_organization_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.atlas_trial_profiles%rowtype;
  v_name text;
  v_slug text;
  v_base_slug text;
  v_organization_id uuid;
  v_prospect_id uuid;
begin
  if auth.uid() is null or not public.is_atlas_super_admin() then
    raise exception 'Atlas Super Admin access is required' using errcode = '42501';
  end if;

  select * into v_profile
  from public.atlas_trial_profiles
  where user_id = p_user_id
  for update;

  if not found then
    raise exception 'Trial was not found' using errcode = 'P0002';
  end if;

  if v_profile.converted_organization_id is not null then
    raise exception 'This trial already converted to a client' using errcode = '22023';
  end if;

  v_name := coalesce(nullif(btrim(p_organization_name), ''), v_profile.business_name);

  v_base_slug := btrim(
    left(btrim(regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g'), '-'), 60),
    '-'
  );
  if v_base_slug = '' then
    v_base_slug := 'client';
  end if;

  v_slug := v_base_slug;
  while exists (select 1 from public.organizations where slug = v_slug) loop
    v_slug := v_base_slug || '-' || substr(md5(gen_random_uuid()::text), 1, 4);
  end loop;

  insert into public.organizations (name, slug)
  values (v_name, v_slug)
  returning id into v_organization_id;

  insert into public.organization_memberships (organization_id, user_id, role)
  values (v_organization_id, p_user_id, 'owner')
  on conflict (organization_id, user_id) do update set role = 'owner';

  update public.atlas_trial_profiles
  set converted_organization_id = v_organization_id,
      converted_at = now()
  where user_id = p_user_id;

  v_prospect_id := public.sync_atlas_trial_prospect(p_user_id);

  if v_prospect_id is not null then
    update public.atlas_sales_prospects
    set status = 'won',
        converted_organization_id = v_organization_id,
        next_action = 'Client onboarding: complete the business profile and first weekly plan',
        next_action_at = now() + interval '2 days',
        updated_by = auth.uid()
    where id = v_prospect_id;

    insert into public.atlas_sales_events (
      prospect_id, actor_user_id, actor_role, event_type, direction, summary, metadata
    ) values (
      v_prospect_id,
      auth.uid(),
      'manny',
      'trial.converted',
      'internal',
      'Trial converted to client workspace ' || v_name,
      jsonb_build_object('organization_id', v_organization_id, 'organization_slug', v_slug)
    );
  end if;

  return v_organization_id;
end;
$$;

revoke all on function public.convert_atlas_trial_to_client(uuid, text) from public, anon;
grant execute on function public.convert_atlas_trial_to_client(uuid, text) to authenticated;

-- No DELETE grant is added anywhere. Trial, prospect, and timeline records stay
-- auditable; a trial that is not a fit is closed through the CRM stage instead.
