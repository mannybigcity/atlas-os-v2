-- SIS Lion's Den DEMO desk records + protected-organization guard.
--
-- FOUNDER: If live Lion's Den data lives in production Supabase, run this
-- file in the Supabase SQL editor. Migrations here do not apply themselves
-- to production.
--
-- SIS Custom Creations is a real protected tenant. This file MUST NOT
-- UPDATE public.organizations (no name, slug, industry, profile, owners).
-- It only inserts/upserts DEMO contacts inside the existing SIS org.
-- Match the org with the same rules as isSisOrganization (sis-diy slug or
-- SIS Custom Creations name). Never treat sis-custom-creations as the live slug.

create or replace function public.is_sis_protected_organization(p_name text, p_slug text)
returns boolean
language sql
immutable
as $$
  select
    coalesce(p_name, '') ~* 'sis[[:space:]]*custom[[:space:]]*creations'
    or coalesce(p_name, '') ~* 'sis[-_[:space:]]?diy'
    or coalesce(p_slug, '') ~* 'sis-diy';
$$;

create or replace function public.prevent_sis_organization_identity_mutation()
returns trigger
language plpgsql
as $$
begin
  if public.is_sis_protected_organization(old.name, old.slug) then
    if new.name is distinct from old.name or new.slug is distinct from old.slug then
      raise exception 'SIS Custom Creations is a protected organization. Name and slug cannot be changed.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_sis_organization_identity_mutation
  on public.organizations;
create trigger prevent_sis_organization_identity_mutation
before update on public.organizations
for each row
execute function public.prevent_sis_organization_identity_mutation();

with sis as (
  select organizations.id
  from public.organizations
  where public.is_sis_protected_organization(organizations.name, organizations.slug)
  order by organizations.created_at asc
  limit 1
),
demo_prospects as (
  select
    sis.id as organization_id,
    seed.name,
    seed.opportunity_type,
    seed.stage,
    seed.fit_score,
    seed.owner_role,
    seed.source_label,
    seed.source_url,
    seed.contact_name,
    seed.contact_email,
    seed.research_summary,
    seed.fit_reason,
    seed.next_action,
    current_date + seed.days_until_due as next_action_due,
    jsonb_build_object(
      'demo', true,
      'demo_kind', 'sis_lions_den_demo_desk',
      'no_outreach_sent', true,
      'accepted_for_calling', true,
      'seed_key', seed.seed_key
    ) as metadata
  from sis
  cross join (
    values
      (
        'abc-plumbing',
        'ABC Plumbing (DEMO)',
        'customer',
        'ready_for_follow_up',
        40::smallint,
        'client',
        'DEMO seed — no outreach',
        'https://example.invalid/demo/abc-plumbing',
        'DEMO contact',
        'demo+abc-plumbing@example.invalid',
        'DEMO record only. Fake plumbing lead inside the SIS Lion''s Den so the salesman can practice the call list. Not a real business. Atlas must never email, call, or text this contact.',
        'DEMO fixture for the SIS desk. Do not treat as live outreach. SIS Custom Creations remains the workspace owner, not this lead.',
        'DEMO: salesman can call ABC Plumbing. Atlas has not contacted them.',
        0
      ),
      (
        '123-catering',
        '123 Catering (DEMO)',
        'customer',
        'ready_for_follow_up',
        40::smallint,
        'client',
        'DEMO seed — no outreach',
        'https://example.invalid/demo/123-catering',
        'DEMO contact',
        'demo+123-catering@example.invalid',
        'DEMO record only. Fake catering lead for SIS Custom Creations follow-up practice. Not a real caterer. Atlas must never email, call, or text this contact.',
        'DEMO fixture so Today/Tomorrow queues have a dated next action. This is a contact of SIS, not a replacement company.',
        'DEMO: follow up with 123 Catering tomorrow. Atlas has not contacted them.',
        1
      ),
      (
        'xyz-electric',
        'XYZ Electric (DEMO)',
        'customer',
        'ready_for_follow_up',
        40::smallint,
        'client',
        'DEMO seed — no outreach',
        'https://example.invalid/demo/xyz-electric',
        'DEMO contact',
        'demo+xyz-electric@example.invalid',
        'DEMO record only. Fake electrical contractor lead for the SIS Lion''s Den calendar and later queue. Not a real electrician. Atlas must never email, call, or text this contact.',
        'DEMO fixture for a later follow-up date. Leave SIS Custom Creations identity unchanged.',
        'DEMO: later follow-up with XYZ Electric. Atlas has not contacted them.',
        7
      )
  ) as seed(
    seed_key,
    name,
    opportunity_type,
    stage,
    fit_score,
    owner_role,
    source_label,
    source_url,
    contact_name,
    contact_email,
    research_summary,
    fit_reason,
    next_action,
    days_until_due
  )
)
insert into public.organization_opportunities (
  organization_id,
  name,
  opportunity_type,
  stage,
  fit_score,
  owner_role,
  source_label,
  source_url,
  contact_name,
  contact_email,
  research_summary,
  fit_reason,
  next_action,
  next_action_due,
  metadata
)
select
  organization_id,
  name,
  opportunity_type,
  stage,
  fit_score,
  owner_role,
  source_label,
  source_url,
  contact_name,
  contact_email,
  research_summary,
  fit_reason,
  next_action,
  next_action_due,
  metadata
from demo_prospects
on conflict (organization_id, name, opportunity_type) do update
set
  stage = excluded.stage,
  fit_score = excluded.fit_score,
  owner_role = excluded.owner_role,
  source_label = excluded.source_label,
  source_url = excluded.source_url,
  contact_name = excluded.contact_name,
  contact_email = excluded.contact_email,
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
  'DEMO seed: accepted into Prospects. Atlas has not contacted anyone.',
  opportunities.research_summary
from public.organization_opportunities opportunities
where opportunities.metadata ->> 'demo_kind' = 'sis_lions_den_demo_desk'
  and opportunities.name in (
    'ABC Plumbing (DEMO)',
    '123 Catering (DEMO)',
    'XYZ Electric (DEMO)'
  )
  and not exists (
    select 1
    from public.organization_opportunity_events events
    where events.opportunity_id = opportunities.id
      and events.event_type = 'created'
  );

insert into public.organization_hunter_review_items (
  organization_id,
  place_id,
  name,
  formatted_address,
  google_maps_url,
  website_url,
  primary_type,
  business_status,
  search_query,
  status
)
select
  organizations.id,
  'demo-sis-desk-oak-street-vinyl',
  'Oak Street Vinyl (DEMO)',
  'DEMO address only — not a real location. Do not visit or contact.',
  'https://example.invalid/maps/demo-oak-street-vinyl',
  'https://example.invalid/demo/oak-street-vinyl',
  'demo_lead',
  'DEMO',
  'DEMO SIS desk hunter review pile — no live search',
  'pending'
from public.organizations
where public.is_sis_protected_organization(organizations.name, organizations.slug)
order by organizations.created_at asc
limit 1
on conflict (organization_id, place_id) do update
set
  name = excluded.name,
  formatted_address = excluded.formatted_address,
  google_maps_url = excluded.google_maps_url,
  website_url = excluded.website_url,
  primary_type = excluded.primary_type,
  business_status = excluded.business_status,
  search_query = excluded.search_query,
  status = 'pending',
  accepted_opportunity_id = null,
  updated_at = now();

insert into public.organization_notes (
  organization_id,
  title,
  body,
  attention_requested
)
select
  organizations.id,
  seed.title,
  seed.body,
  false
from public.organizations
cross join (
  values
    (
      'DEMO: ABC Plumbing',
      'DEMO note for ABC Plumbing. Fake contact of SIS Custom Creations. Atlas has not called, emailed, or texted them.'
    ),
    (
      'DEMO: 123 Catering',
      'DEMO note for 123 Catering. Fake contact of SIS Custom Creations. Atlas has not called, emailed, or texted them.'
    ),
    (
      'DEMO: XYZ Electric',
      'DEMO note for XYZ Electric. Fake contact of SIS Custom Creations. Atlas has not called, emailed, or texted them.'
    )
) as seed(title, body)
where public.is_sis_protected_organization(organizations.name, organizations.slug)
  and not exists (
    select 1
    from public.organization_notes notes
    where notes.organization_id = organizations.id
      and notes.title = seed.title
  );

insert into public.organization_content_drafts (
  organization_id,
  draft_date,
  slot,
  campaign,
  title,
  headline,
  supporting_text,
  caption,
  call_to_action,
  platforms,
  visual_style,
  status,
  generated_by,
  generation_source,
  metadata
)
select
  organizations.id,
  date '2026-08-29',
  'demo-desk-abc-plumbing',
  'DEMO desk sample',
  'DEMO caption for ABC Plumbing',
  'DEMO — not for publishing',
  'Sample caption only. Tied to ABC Plumbing (DEMO).',
  'DEMO draft only for ABC Plumbing. Download and review if you want. Do not publish. Atlas did not post this anywhere. This is a fake contact of SIS Custom Creations, not a change to the SIS business.',
  'DEMO: do not publish or send.',
  array['instagram']::text[],
  'atlas_branded',
  'ready_for_review',
  'micah',
  'manual',
  jsonb_build_object(
    'demo', true,
    'demo_kind', 'sis_lions_den_demo_desk',
    'tied_to', 'ABC Plumbing (DEMO)',
    'published', false
  )
from public.organizations
where public.is_sis_protected_organization(organizations.name, organizations.slug)
order by organizations.created_at asc
limit 1
on conflict (organization_id, draft_date, slot) do update
set
  title = excluded.title,
  headline = excluded.headline,
  supporting_text = excluded.supporting_text,
  caption = excluded.caption,
  call_to_action = excluded.call_to_action,
  status = 'ready_for_review',
  metadata = excluded.metadata,
  updated_at = now();

insert into public.organization_content_draft_events (
  draft_id,
  organization_id,
  event_type,
  note,
  actor_label
)
select
  drafts.id,
  drafts.organization_id,
  'created',
  'DEMO MICAH draft for ABC Plumbing. Caption only. Not published.',
  'DEMO seed'
from public.organization_content_drafts drafts
where drafts.slot = 'demo-desk-abc-plumbing'
  and drafts.metadata ->> 'demo_kind' = 'sis_lions_den_demo_desk'
  and not exists (
    select 1
    from public.organization_content_draft_events events
    where events.draft_id = drafts.id
      and events.event_type = 'created'
  );
