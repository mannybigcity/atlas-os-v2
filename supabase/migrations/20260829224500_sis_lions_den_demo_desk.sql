-- SIS Lion's Den DEMO desk records + protected-organization guard.
--
-- FOUNDER: If live Lion's Den data lives in production Supabase, run this
-- file in the Supabase SQL editor. Deploying the site does not apply it.
-- Re-run this same file after each DEMO desk update. It is idempotent.
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
    seed.contact_phone,
    seed.contact_social,
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
        78::smallint,
        'client',
        'DEMO seed — no outreach',
        'https://example.invalid/demo/abc-plumbing',
        'Jordan Hale (DEMO)',
        'demo+abc-plumbing@example.invalid',
        '(555) 010-0101',
        'https://example.invalid/demo/abc-plumbing',
        'DEMO record only. Fake plumbing shop that asked SIS Custom Creations about branded hats and a small paint-splatter party for the crew. Address is not real. Atlas must never email, call, or text this contact.',
        'DEMO fixture for the SIS call list. Jordan Hale is a fake contact of SIS, not a replacement for the SIS company.',
        'DEMO: salesman can call Jordan Hale at ABC Plumbing today. Atlas has not contacted them.',
        0
      ),
      (
        '123-catering',
        '123 Catering (DEMO)',
        'customer',
        'ready_for_follow_up',
        78::smallint,
        'client',
        'DEMO seed — no outreach',
        'https://example.invalid/demo/123-catering',
        'Riley Chen (DEMO)',
        'demo+123-catering@example.invalid',
        '(555) 010-0102',
        'https://example.invalid/demo/123-catering',
        'DEMO record only. Fake catering kitchen interested in staff shirts and a paint-party for a client appreciation night. Not a real caterer. Atlas must never email, call, or text this contact.',
        'DEMO fixture so the Tomorrow queue has a dated next action. This is a contact of SIS, not a replacement company.',
        'DEMO: follow up with Riley Chen at 123 Catering tomorrow. Atlas has not contacted them.',
        1
      ),
      (
        'xyz-electric',
        'XYZ Electric (DEMO)',
        'customer',
        'ready_for_follow_up',
        78::smallint,
        'client',
        'DEMO seed — no outreach',
        'https://example.invalid/demo/xyz-electric',
        'Morgan Blake (DEMO)',
        'demo+xyz-electric@example.invalid',
        '(555) 010-0103',
        'https://example.invalid/demo/xyz-electric',
        'DEMO record only. Fake electrical contractor looking at laser-engraved tool tags and a crew paint night. Not a real electrician. Atlas must never email, call, or text this contact.',
        'DEMO fixture for the Later queue and calendar. Leave SIS Custom Creations identity unchanged.',
        'DEMO: later follow-up with Morgan Blake at XYZ Electric. Atlas has not contacted them.',
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
    contact_phone,
    contact_social,
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
  contact_phone,
  contact_social,
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
  contact_phone,
  contact_social,
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
  'next_action_set',
  'david',
  opportunities.next_action,
  'Call ' || opportunities.contact_name || ' at ' || opportunities.contact_phone || '. Fake DEMO number. Atlas will not dial it.'
from public.organization_opportunities opportunities
where opportunities.metadata ->> 'demo_kind' = 'sis_lions_den_demo_desk'
  and opportunities.name in (
    'ABC Plumbing (DEMO)',
    '123 Catering (DEMO)',
    'XYZ Electric (DEMO)'
  )
  and opportunities.next_action is not null
  and not exists (
    select 1
    from public.organization_opportunity_events events
    where events.opportunity_id = opportunities.id
      and events.event_type = 'next_action_set'
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
  status,
  accepted_opportunity_id
)
select
  organizations.id,
  'demo-sis-desk-oak-street-vinyl',
  'Oak Street Vinyl (DEMO)',
  '404 Demo Oak St (not a real location). Do not visit or contact.',
  'https://example.invalid/maps/demo-oak-street-vinyl',
  'https://example.invalid/demo/oak-street-vinyl',
  'demo_lead',
  'DEMO',
  'DEMO SIS desk hunter review pile — no live search',
  'pending',
  null
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
  status,
  accepted_opportunity_id
)
select
  opportunities.organization_id,
  seed.place_id,
  opportunities.name,
  seed.formatted_address,
  seed.google_maps_url,
  seed.website_url,
  'demo_lead',
  'DEMO',
  seed.search_query,
  'accepted',
  opportunities.id
from public.organization_opportunities opportunities
join (
  values
    (
      'ABC Plumbing (DEMO)',
      'demo-sis-desk-accepted-abc-plumbing',
      '101 Demo Main St (not a real address), Demo City',
      'https://example.invalid/maps/demo-abc-plumbing',
      'https://example.invalid/demo/abc-plumbing',
      'DEMO accepted SIS desk find — ABC Plumbing (DEMO)'
    ),
    (
      '123 Catering (DEMO)',
      'demo-sis-desk-accepted-123-catering',
      '202 Demo Market Ave (not a real address), Demo City',
      'https://example.invalid/maps/demo-123-catering',
      'https://example.invalid/demo/123-catering',
      'DEMO accepted SIS desk find — 123 Catering (DEMO)'
    ),
    (
      'XYZ Electric (DEMO)',
      'demo-sis-desk-accepted-xyz-electric',
      '303 Demo Utility Rd (not a real address), Demo City',
      'https://example.invalid/maps/demo-xyz-electric',
      'https://example.invalid/demo/xyz-electric',
      'DEMO accepted SIS desk find — XYZ Electric (DEMO)'
    )
) as seed(name, place_id, formatted_address, google_maps_url, website_url, search_query)
  on seed.name = opportunities.name
where opportunities.metadata ->> 'demo_kind' = 'sis_lions_den_demo_desk'
on conflict (organization_id, place_id) do update
set
  name = excluded.name,
  formatted_address = excluded.formatted_address,
  google_maps_url = excluded.google_maps_url,
  website_url = excluded.website_url,
  primary_type = excluded.primary_type,
  business_status = excluded.business_status,
  search_query = excluded.search_query,
  status = 'accepted',
  accepted_opportunity_id = excluded.accepted_opportunity_id,
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
      E'DEMO internal note — ABC Plumbing\n\nContact: Jordan Hale (DEMO)\nPhone: (555) 010-0101 (fake, do not dial as live outreach)\nEmail: demo+abc-plumbing@example.invalid\n\nThey want a quote for 12 embroidered hats and a Saturday paint-splatter party for the shop crew. Confirm guest count and whether they want a door-hanger theme.\n\nAtlas has not called, emailed, or texted anyone. The salesman owns the next step. This is a practice contact inside the SIS Lion''s Den, not a change to SIS Custom Creations.'
    ),
    (
      'DEMO: 123 Catering',
      E'DEMO internal note — 123 Catering\n\nContact: Riley Chen (DEMO)\nPhone: (555) 010-0102 (fake, do not dial as live outreach)\nEmail: demo+123-catering@example.invalid\n\nThey asked about 20 staff shirts and a door-hanger paint party after a tasting event. Confirm date, guest count, and whether they want a deposit invoice.\n\nAtlas has not called, emailed, or texted anyone. Follow up tomorrow. This is a practice contact inside the SIS Lion''s Den.'
    ),
    (
      'DEMO: XYZ Electric',
      E'DEMO internal note — XYZ Electric\n\nContact: Morgan Blake (DEMO)\nPhone: (555) 010-0103 (fake, do not dial as live outreach)\nEmail: demo+xyz-electric@example.invalid\n\nThey want engraved tool tags and a Friday crew paint night in two weeks. Confirm venue access and whether they can host 8 guests in the shop.\n\nAtlas has not called, emailed, or texted anyone. This is a later follow-up only. Practice contact of SIS, not a live outreach target.'
    )
) as seed(title, body)
where public.is_sis_protected_organization(organizations.name, organizations.slug)
  and not exists (
    select 1
    from public.organization_notes notes
    where notes.organization_id = organizations.id
      and notes.title = seed.title
  );

update public.organization_notes notes
set
  body = seed.body,
  updated_at = now()
from (
  values
    (
      'DEMO: ABC Plumbing',
      E'DEMO internal note — ABC Plumbing\n\nContact: Jordan Hale (DEMO)\nPhone: (555) 010-0101 (fake, do not dial as live outreach)\nEmail: demo+abc-plumbing@example.invalid\n\nThey want a quote for 12 embroidered hats and a Saturday paint-splatter party for the shop crew. Confirm guest count and whether they want a door-hanger theme.\n\nAtlas has not called, emailed, or texted anyone. The salesman owns the next step. This is a practice contact inside the SIS Lion''s Den, not a change to SIS Custom Creations.'
    ),
    (
      'DEMO: 123 Catering',
      E'DEMO internal note — 123 Catering\n\nContact: Riley Chen (DEMO)\nPhone: (555) 010-0102 (fake, do not dial as live outreach)\nEmail: demo+123-catering@example.invalid\n\nThey asked about 20 staff shirts and a door-hanger paint party after a tasting event. Confirm date, guest count, and whether they want a deposit invoice.\n\nAtlas has not called, emailed, or texted anyone. Follow up tomorrow. This is a practice contact inside the SIS Lion''s Den.'
    ),
    (
      'DEMO: XYZ Electric',
      E'DEMO internal note — XYZ Electric\n\nContact: Morgan Blake (DEMO)\nPhone: (555) 010-0103 (fake, do not dial as live outreach)\nEmail: demo+xyz-electric@example.invalid\n\nThey want engraved tool tags and a Friday crew paint night in two weeks. Confirm venue access and whether they can host 8 guests in the shop.\n\nAtlas has not called, emailed, or texted anyone. This is a later follow-up only. Practice contact of SIS, not a live outreach target.'
    )
) as seed(title, body)
where notes.title = seed.title
  and exists (
    select 1
    from public.organizations
    where organizations.id = notes.organization_id
      and public.is_sis_protected_organization(organizations.name, organizations.slug)
  )
  and notes.body is distinct from seed.body;

insert into public.note_messages (
  organization_id,
  note_id,
  author_kind,
  author_display_name,
  body,
  attention_requested
)
select
  notes.organization_id,
  notes.id,
  seed.author_kind,
  seed.author_display_name,
  seed.body,
  false
from public.organization_notes notes
join public.organizations
  on organizations.id = notes.organization_id
join (
  values
    (
      'DEMO: ABC Plumbing',
      'client',
      'DEMO seed',
      E'DEMO internal note — ABC Plumbing\n\nContact: Jordan Hale (DEMO)\nPhone: (555) 010-0101 (fake, do not dial as live outreach)\nEmail: demo+abc-plumbing@example.invalid\n\nThey want a quote for 12 embroidered hats and a Saturday paint-splatter party for the shop crew. Confirm guest count and whether they want a door-hanger theme.\n\nAtlas has not called, emailed, or texted anyone. The salesman owns the next step. This is a practice contact inside the SIS Lion''s Den, not a change to SIS Custom Creations.'
    ),
    (
      'DEMO: ABC Plumbing',
      'atlas_admin',
      'Ask Atlas (DEMO)',
      'DEMO staff reply: keep ABC Plumbing on today''s call list. Atlas has not contacted Jordan Hale. Salesman owns the next step.'
    ),
    (
      'DEMO: 123 Catering',
      'client',
      'DEMO seed',
      E'DEMO internal note — 123 Catering\n\nContact: Riley Chen (DEMO)\nPhone: (555) 010-0102 (fake, do not dial as live outreach)\nEmail: demo+123-catering@example.invalid\n\nThey asked about 20 staff shirts and a door-hanger paint party after a tasting event. Confirm date, guest count, and whether they want a deposit invoice.\n\nAtlas has not called, emailed, or texted anyone. Follow up tomorrow. This is a practice contact inside the SIS Lion''s Den.'
    ),
    (
      'DEMO: 123 Catering',
      'atlas_admin',
      'Ask Atlas (DEMO)',
      'DEMO staff reply: 123 Catering sits in Tomorrow. Atlas has not contacted Riley Chen. Confirm guest count before any live call.'
    ),
    (
      'DEMO: XYZ Electric',
      'client',
      'DEMO seed',
      E'DEMO internal note — XYZ Electric\n\nContact: Morgan Blake (DEMO)\nPhone: (555) 010-0103 (fake, do not dial as live outreach)\nEmail: demo+xyz-electric@example.invalid\n\nThey want engraved tool tags and a Friday crew paint night in two weeks. Confirm venue access and whether they can host 8 guests in the shop.\n\nAtlas has not called, emailed, or texted anyone. This is a later follow-up only. Practice contact of SIS, not a live outreach target.'
    ),
    (
      'DEMO: XYZ Electric',
      'atlas_admin',
      'Ask Atlas (DEMO)',
      'DEMO staff reply: XYZ Electric is the Later follow-up. Atlas has not contacted Morgan Blake. Leave SIS Custom Creations identity unchanged.'
    )
) as seed(title, author_kind, author_display_name, body)
  on seed.title = notes.title
where public.is_sis_protected_organization(organizations.name, organizations.slug)
  and not exists (
    select 1
    from public.note_messages messages
    where messages.note_id = notes.id
      and messages.body = seed.body
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
  image_svg,
  status,
  generated_by,
  generation_source,
  metadata
)
select
  organizations.id,
  date '2026-08-29',
  seed.slot,
  'DEMO desk sample',
  seed.title,
  seed.headline,
  seed.supporting_text,
  seed.caption,
  'DEMO: do not publish or send.',
  array['instagram']::text[],
  'atlas_branded',
  seed.image_svg,
  'ready_for_review',
  'micah',
  'manual',
  jsonb_build_object(
    'demo', true,
    'demo_kind', 'sis_lions_den_demo_desk',
    'tied_to', seed.tied_to,
    'published', false
  )
from (
  select organizations.id
  from public.organizations
  where public.is_sis_protected_organization(organizations.name, organizations.slug)
  order by organizations.created_at asc
  limit 1
) as organizations
cross join (
  values
    (
      'demo-desk-abc-plumbing',
      'DEMO caption for ABC Plumbing',
      'DEMO — hats for the crew',
      'Sample caption only. Tied to ABC Plumbing (DEMO).',
      'DEMO draft only for ABC Plumbing. Download and review if you want. Do not publish. Atlas did not post this. Fake contact of SIS Custom Creations, not a change to the SIS business.',
      'ABC Plumbing (DEMO)',
      '<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080"><rect width="1080" height="1080" fill="#071b42"/><text x="80" y="180" fill="#f5b932" font-size="34" font-family="Arial,sans-serif">DEMO DRAFT</text><text x="80" y="360" fill="#ffffff" font-size="58" font-family="Arial,sans-serif">DEMO — hats for the crew</text><text x="80" y="460" fill="#d8c27a" font-size="32" font-family="Arial,sans-serif">ABC Plumbing (DEMO)</text><text x="80" y="980" fill="#fff8e6" font-size="26" font-family="Arial,sans-serif">Not for publishing. Atlas did not post this.</text></svg>'
    ),
    (
      'demo-desk-123-catering',
      'DEMO caption for 123 Catering',
      'DEMO — tasting night shirts',
      'Sample caption only. Tied to 123 Catering (DEMO).',
      'DEMO draft only for 123 Catering. Download and review if you want. Do not publish. Atlas did not post this. Fake contact of SIS Custom Creations.',
      '123 Catering (DEMO)',
      '<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080"><rect width="1080" height="1080" fill="#071b42"/><text x="80" y="180" fill="#f5b932" font-size="34" font-family="Arial,sans-serif">DEMO DRAFT</text><text x="80" y="360" fill="#ffffff" font-size="58" font-family="Arial,sans-serif">DEMO — tasting night shirts</text><text x="80" y="460" fill="#d8c27a" font-size="32" font-family="Arial,sans-serif">123 Catering (DEMO)</text><text x="80" y="980" fill="#fff8e6" font-size="26" font-family="Arial,sans-serif">Not for publishing. Atlas did not post this.</text></svg>'
    ),
    (
      'demo-desk-xyz-electric',
      'DEMO caption for XYZ Electric',
      'DEMO — crew night',
      'Sample caption only. Tied to XYZ Electric (DEMO).',
      'DEMO draft only for XYZ Electric. Download and review if you want. Do not publish. Atlas did not post this. Fake contact of SIS Custom Creations.',
      'XYZ Electric (DEMO)',
      '<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080"><rect width="1080" height="1080" fill="#071b42"/><text x="80" y="180" fill="#f5b932" font-size="34" font-family="Arial,sans-serif">DEMO DRAFT</text><text x="80" y="360" fill="#ffffff" font-size="58" font-family="Arial,sans-serif">DEMO — crew night</text><text x="80" y="460" fill="#d8c27a" font-size="32" font-family="Arial,sans-serif">XYZ Electric (DEMO)</text><text x="80" y="980" fill="#fff8e6" font-size="26" font-family="Arial,sans-serif">Not for publishing. Atlas did not post this.</text></svg>'
    )
) as seed(slot, title, headline, supporting_text, caption, tied_to, image_svg)
on conflict (organization_id, draft_date, slot) do update
set
  title = excluded.title,
  headline = excluded.headline,
  supporting_text = excluded.supporting_text,
  caption = excluded.caption,
  call_to_action = excluded.call_to_action,
  image_svg = excluded.image_svg,
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
  'DEMO MICAH draft. Caption only. Not published. Downloadable SVG attached.',
  'DEMO seed'
from public.organization_content_drafts drafts
where drafts.slot in (
    'demo-desk-abc-plumbing',
    'demo-desk-123-catering',
    'demo-desk-xyz-electric'
  )
  and drafts.metadata ->> 'demo_kind' = 'sis_lions_den_demo_desk'
  and not exists (
    select 1
    from public.organization_content_draft_events events
    where events.draft_id = drafts.id
      and events.event_type = 'created'
  );

insert into public.organization_sis_customers (
  organization_id,
  display_name,
  business_name,
  email,
  phone,
  notes,
  source_label,
  metadata
)
select
  organizations.id,
  seed.display_name,
  seed.business_name,
  seed.email,
  seed.phone,
  seed.notes,
  'DEMO seed',
  jsonb_build_object(
    'demo', true,
    'demo_kind', 'sis_lions_den_demo_desk',
    'seed_key', seed.seed_key
  )
from public.organizations
cross join (
  values
    (
      'abc-plumbing',
      'Jordan Hale (DEMO)',
      'ABC Plumbing (DEMO)',
      'demo+abc-plumbing@example.invalid',
      '(555) 010-0101',
      'DEMO record only. Fake plumbing shop that asked SIS Custom Creations about branded hats and a small paint-splatter party for the crew. Address is not real. Atlas must never email, call, or text this contact.'
    ),
    (
      '123-catering',
      'Riley Chen (DEMO)',
      '123 Catering (DEMO)',
      'demo+123-catering@example.invalid',
      '(555) 010-0102',
      'DEMO record only. Fake catering kitchen interested in staff shirts and a paint-party for a client appreciation night. Not a real caterer. Atlas must never email, call, or text this contact.'
    ),
    (
      'xyz-electric',
      'Morgan Blake (DEMO)',
      'XYZ Electric (DEMO)',
      'demo+xyz-electric@example.invalid',
      '(555) 010-0103',
      'DEMO record only. Fake electrical contractor looking at laser-engraved tool tags and a crew paint night. Not a real electrician. Atlas must never email, call, or text this contact.'
    )
) as seed(seed_key, display_name, business_name, email, phone, notes)
where public.is_sis_protected_organization(organizations.name, organizations.slug)
  and not exists (
    select 1
    from public.organization_sis_customers customers
    where customers.organization_id = organizations.id
      and customers.email = seed.email
  );

update public.organization_sis_customers customers
set
  display_name = seed.display_name,
  business_name = seed.business_name,
  phone = seed.phone,
  notes = seed.notes,
  source_label = 'DEMO seed',
  metadata = jsonb_build_object(
    'demo', true,
    'demo_kind', 'sis_lions_den_demo_desk',
    'seed_key', seed.seed_key
  ),
  updated_at = now()
from (
  values
    ('abc-plumbing', 'Jordan Hale (DEMO)', 'ABC Plumbing (DEMO)', 'demo+abc-plumbing@example.invalid', '(555) 010-0101', 'DEMO record only. Fake plumbing shop that asked SIS Custom Creations about branded hats and a small paint-splatter party for the crew. Address is not real. Atlas must never email, call, or text this contact.'),
    ('123-catering', 'Riley Chen (DEMO)', '123 Catering (DEMO)', 'demo+123-catering@example.invalid', '(555) 010-0102', 'DEMO record only. Fake catering kitchen interested in staff shirts and a paint-party for a client appreciation night. Not a real caterer. Atlas must never email, call, or text this contact.'),
    ('xyz-electric', 'Morgan Blake (DEMO)', 'XYZ Electric (DEMO)', 'demo+xyz-electric@example.invalid', '(555) 010-0103', 'DEMO record only. Fake electrical contractor looking at laser-engraved tool tags and a crew paint night. Not a real electrician. Atlas must never email, call, or text this contact.')
) as seed(seed_key, display_name, business_name, email, phone, notes)
where customers.email = seed.email
  and exists (
    select 1
    from public.organizations
    where organizations.id = customers.organization_id
      and public.is_sis_protected_organization(organizations.name, organizations.slug)
  );

insert into public.organization_sis_leads (
  organization_id,
  customer_id,
  status,
  offer,
  source_label,
  details,
  due_date,
  next_action,
  next_action_due,
  owner_user_id,
  source_request_id,
  raw_payload
)
select
  customers.organization_id,
  customers.id,
  'new',
  seed.offer,
  'DEMO desk seed',
  customers.notes,
  current_date + seed.days_until_due,
  seed.next_action,
  current_date + seed.days_until_due,
  (
    select memberships.user_id
    from public.organization_memberships memberships
    where memberships.organization_id = customers.organization_id
    order by memberships.created_at asc nulls last
    limit 1
  ),
  seed.source_request_id,
  jsonb_build_object(
    'demo', true,
    'demo_kind', 'sis_lions_den_demo_desk',
    'seed_key', seed.seed_key,
    'contact_name', customers.display_name,
    'contact_phone', customers.phone,
    'contact_email', customers.email
  )
from public.organization_sis_customers customers
join (
  values
    (
      'abc-plumbing',
      'demo-desk-abc-plumbing',
      'DEMO: hats + crew paint-splatter party',
      'DEMO: salesman can call Jordan Hale at ABC Plumbing today. Atlas has not contacted them.',
      0
    ),
    (
      '123-catering',
      'demo-desk-123-catering',
      'DEMO: staff shirts + appreciation paint party',
      'DEMO: follow up with Riley Chen at 123 Catering tomorrow. Atlas has not contacted them.',
      1
    ),
    (
      'xyz-electric',
      'demo-desk-xyz-electric',
      'DEMO: engraved tags + crew paint night',
      'DEMO: later follow-up with Morgan Blake at XYZ Electric. Atlas has not contacted them.',
      7
    )
) as seed(seed_key, source_request_id, offer, next_action, days_until_due)
  on customers.metadata ->> 'seed_key' = seed.seed_key
where customers.metadata ->> 'demo_kind' = 'sis_lions_den_demo_desk'
on conflict (organization_id, source_request_id) where source_request_id is not null do update
set
  customer_id = excluded.customer_id,
  status = excluded.status,
  offer = excluded.offer,
  source_label = excluded.source_label,
  details = excluded.details,
  due_date = excluded.due_date,
  next_action = excluded.next_action,
  next_action_due = excluded.next_action_due,
  raw_payload = excluded.raw_payload,
  updated_at = now();

insert into public.organization_sis_quotes (
  organization_id,
  customer_id,
  lead_id,
  quote_number,
  status,
  currency,
  subtotal,
  tax,
  total,
  notes
)
select
  leads.organization_id,
  leads.customer_id,
  leads.id,
  seed.quote_number,
  'sent',
  'USD',
  seed.total_due,
  0,
  seed.total_due,
  leads.details
from public.organization_sis_leads leads
join (
  values
    ('demo-desk-abc-plumbing', 'DEMO-Q-ABC', 480::numeric),
    ('demo-desk-123-catering', 'DEMO-Q-123', 720::numeric),
    ('demo-desk-xyz-electric', 'DEMO-Q-XYZ', 360::numeric)
) as seed(source_request_id, quote_number, total_due)
  on seed.source_request_id = leads.source_request_id
where leads.raw_payload ->> 'demo_kind' = 'sis_lions_den_demo_desk'
on conflict (organization_id, quote_number) do update
set
  customer_id = excluded.customer_id,
  lead_id = excluded.lead_id,
  status = 'sent',
  subtotal = excluded.subtotal,
  tax = excluded.tax,
  total = excluded.total,
  notes = excluded.notes,
  updated_at = now();

insert into public.organization_sis_quote_items (
  organization_id,
  quote_id,
  description,
  quantity,
  unit_price,
  line_total,
  metadata
)
select
  quotes.organization_id,
  quotes.id,
  seed.description,
  1,
  quotes.total,
  quotes.total,
  jsonb_build_object('demo', true, 'demo_kind', 'sis_lions_den_demo_desk')
from public.organization_sis_quotes quotes
join (
  values
    ('DEMO-Q-ABC', 'DEMO: hats + crew paint-splatter party (DEMO)'),
    ('DEMO-Q-123', 'DEMO: staff shirts + appreciation paint party (DEMO)'),
    ('DEMO-Q-XYZ', 'DEMO: engraved tags + crew paint night (DEMO)')
) as seed(quote_number, description)
  on seed.quote_number = quotes.quote_number
where not exists (
  select 1
  from public.organization_sis_quote_items items
  where items.quote_id = quotes.id
    and items.description = seed.description
);

insert into public.organization_sis_orders (
  organization_id,
  customer_id,
  quote_id,
  order_number,
  status,
  payment_status,
  currency,
  subtotal,
  tax,
  total,
  due_date,
  artwork_approved_at,
  paid_at,
  notes
)
select
  quotes.organization_id,
  quotes.customer_id,
  quotes.id,
  seed.order_number,
  seed.order_status,
  seed.payment_status,
  'USD',
  quotes.total,
  0,
  quotes.total,
  current_date + seed.days_until_due,
  seed.artwork_approved_at,
  seed.paid_at,
  quotes.notes
from public.organization_sis_quotes quotes
join (
  values
    ('DEMO-Q-ABC', 'DEMO-O-ABC', 'draft', 'unpaid', 0, null::timestamptz, null::timestamptz),
    ('DEMO-Q-123', 'DEMO-O-123', 'awaiting_payment', 'pending', 1, null::timestamptz, null::timestamptz),
    ('DEMO-Q-XYZ', 'DEMO-O-XYZ', 'paid', 'paid', 7, '2026-08-28T18:00:00Z'::timestamptz, '2026-08-28T18:00:00Z'::timestamptz)
) as seed(quote_number, order_number, order_status, payment_status, days_until_due, artwork_approved_at, paid_at)
  on seed.quote_number = quotes.quote_number
on conflict (organization_id, order_number) do update
set
  customer_id = excluded.customer_id,
  quote_id = excluded.quote_id,
  status = excluded.status,
  payment_status = excluded.payment_status,
  subtotal = excluded.subtotal,
  tax = excluded.tax,
  total = excluded.total,
  due_date = excluded.due_date,
  artwork_approved_at = excluded.artwork_approved_at,
  paid_at = excluded.paid_at,
  notes = excluded.notes,
  updated_at = now();

insert into public.organization_sis_order_items (
  organization_id,
  order_id,
  description,
  quantity,
  unit_price,
  line_total,
  metadata
)
select
  orders.organization_id,
  orders.id,
  seed.description,
  1,
  orders.total,
  orders.total,
  jsonb_build_object('demo', true, 'demo_kind', 'sis_lions_den_demo_desk')
from public.organization_sis_orders orders
join (
  values
    ('DEMO-O-ABC', 'DEMO: hats + crew paint-splatter party (DEMO)'),
    ('DEMO-O-123', 'DEMO: staff shirts + appreciation paint party (DEMO)'),
    ('DEMO-O-XYZ', 'DEMO: engraved tags + crew paint night (DEMO)')
) as seed(order_number, description)
  on seed.order_number = orders.order_number
where not exists (
  select 1
  from public.organization_sis_order_items items
  where items.order_id = orders.id
    and items.description = seed.description
);

insert into public.organization_sis_fulfillment_jobs (
  organization_id,
  order_id,
  status
)
select
  orders.organization_id,
  orders.id,
  case when orders.payment_status = 'paid' then 'ready_for_production' else 'locked_pending_payment' end
from public.organization_sis_orders orders
where orders.order_number in ('DEMO-O-ABC', 'DEMO-O-123', 'DEMO-O-XYZ')
on conflict (order_id) do update
set
  status = excluded.status,
  updated_at = now();

insert into public.organization_sis_party_events (
  organization_id,
  lead_id,
  stage,
  host_name,
  preferred_contact_method,
  party_type,
  guest_count,
  preferred_date,
  party_starts_at,
  address,
  city,
  venue_type,
  door_hanger_theme,
  deposit_status,
  total_due,
  amount_paid,
  calendar_status,
  customer_confirmation_status,
  owner_user_id,
  next_action,
  next_action_due
)
select
  leads.organization_id,
  leads.id,
  case
    when (
      select memberships.user_id
      from public.organization_memberships memberships
      where memberships.organization_id = leads.organization_id
      limit 1
    ) is null then 'won_follow_up'
    else seed.stage
  end,
  seed.host_name,
  'phone',
  seed.party_type,
  seed.guest_count,
  current_date + seed.days_until_due,
  ((current_date + seed.days_until_due)::timestamp + interval '17 hours'),
  seed.address,
  'Demo City',
  seed.venue_type,
  seed.theme,
  seed.deposit_status,
  seed.total_due,
  seed.amount_paid,
  seed.calendar_status,
  seed.customer_confirmation,
  (
    select memberships.user_id
    from public.organization_memberships memberships
    where memberships.organization_id = leads.organization_id
    order by memberships.created_at asc nulls last
    limit 1
  ),
  seed.next_action,
  current_date + seed.days_until_due
from public.organization_sis_leads leads
join (
  values
    (
      'demo-desk-abc-plumbing',
      'qualified',
      'Jordan Hale (DEMO)',
      'Adult door-hanger paint party',
      12,
      '101 Demo Main St (not a real address)',
      'Shop bay',
      'Navy hats, gold splatter',
      'unpaid',
      480::numeric,
      0::numeric,
      'tentative',
      'not_sent',
      'DEMO: salesman can call Jordan Hale at ABC Plumbing today. Atlas has not contacted them.',
      0
    ),
    (
      'demo-desk-123-catering',
      'quote_sent',
      'Riley Chen (DEMO)',
      'Client appreciation paint party',
      20,
      '202 Demo Market Ave (not a real address)',
      'Kitchen loft',
      'Citrus splash, black shirts',
      'pending',
      720::numeric,
      180::numeric,
      'tentative',
      'pending',
      'DEMO: follow up with Riley Chen at 123 Catering tomorrow. Atlas has not contacted them.',
      1
    ),
    (
      'demo-desk-xyz-electric',
      'booked',
      'Morgan Blake (DEMO)',
      'Crew paint night',
      8,
      '303 Demo Utility Rd (not a real address)',
      'Warehouse corner',
      'Safety yellow on navy',
      'paid',
      360::numeric,
      360::numeric,
      'confirmed',
      'confirmed',
      'DEMO: later follow-up with Morgan Blake at XYZ Electric. Atlas has not contacted them.',
      7
    )
) as seed(
  source_request_id,
  stage,
  host_name,
  party_type,
  guest_count,
  address,
  venue_type,
  theme,
  deposit_status,
  total_due,
  amount_paid,
  calendar_status,
  customer_confirmation,
  next_action,
  days_until_due
)
  on seed.source_request_id = leads.source_request_id
where leads.raw_payload ->> 'demo_kind' = 'sis_lions_den_demo_desk'
  and not exists (
    select 1
    from public.organization_sis_party_events parties
    where parties.organization_id = leads.organization_id
      and parties.host_name = seed.host_name
  );

update public.organization_sis_party_events parties
set
  stage = case
    when (
      select memberships.user_id
      from public.organization_memberships memberships
      where memberships.organization_id = parties.organization_id
      limit 1
    ) is null then 'won_follow_up'
    else seed.stage
  end,
  preferred_contact_method = 'phone',
  party_type = seed.party_type,
  guest_count = seed.guest_count,
  preferred_date = current_date + seed.days_until_due,
  party_starts_at = ((current_date + seed.days_until_due)::timestamp + interval '17 hours'),
  address = seed.address,
  city = 'Demo City',
  venue_type = seed.venue_type,
  door_hanger_theme = seed.theme,
  deposit_status = seed.deposit_status,
  total_due = seed.total_due,
  amount_paid = seed.amount_paid,
  calendar_status = seed.calendar_status,
  customer_confirmation_status = seed.customer_confirmation,
  next_action = seed.next_action,
  next_action_due = current_date + seed.days_until_due,
  updated_at = now()
from (
  values
    ('Jordan Hale (DEMO)', 'qualified', 'Adult door-hanger paint party', 12, '101 Demo Main St (not a real address)', 'Shop bay', 'Navy hats, gold splatter', 'unpaid', 480::numeric, 0::numeric, 'tentative', 'not_sent', 'DEMO: salesman can call Jordan Hale at ABC Plumbing today. Atlas has not contacted them.', 0),
    ('Riley Chen (DEMO)', 'quote_sent', 'Client appreciation paint party', 20, '202 Demo Market Ave (not a real address)', 'Kitchen loft', 'Citrus splash, black shirts', 'pending', 720::numeric, 180::numeric, 'tentative', 'pending', 'DEMO: follow up with Riley Chen at 123 Catering tomorrow. Atlas has not contacted them.', 1),
    ('Morgan Blake (DEMO)', 'booked', 'Crew paint night', 8, '303 Demo Utility Rd (not a real address)', 'Warehouse corner', 'Safety yellow on navy', 'paid', 360::numeric, 360::numeric, 'confirmed', 'confirmed', 'DEMO: later follow-up with Morgan Blake at XYZ Electric. Atlas has not contacted them.', 7)
) as seed(host_name, stage, party_type, guest_count, address, venue_type, theme, deposit_status, total_due, amount_paid, calendar_status, customer_confirmation, next_action, days_until_due)
where parties.host_name = seed.host_name
  and exists (
    select 1
    from public.organizations
    where organizations.id = parties.organization_id
      and public.is_sis_protected_organization(organizations.name, organizations.slug)
  );

insert into public.organization_sis_activity_events (
  organization_id,
  entity_type,
  entity_id,
  event_type,
  summary,
  payload
)
select
  parties.organization_id,
  'party_event',
  parties.id,
  'demo_seeded',
  'DEMO party record for ' || parties.host_name || '. Atlas will not contact this fake record.',
  jsonb_build_object('demo', true, 'demo_kind', 'sis_lions_den_demo_desk')
from public.organization_sis_party_events parties
where parties.host_name in (
    'Jordan Hale (DEMO)',
    'Riley Chen (DEMO)',
    'Morgan Blake (DEMO)'
  )
  and not exists (
    select 1
    from public.organization_sis_activity_events activity
    where activity.entity_id = parties.id
      and activity.event_type = 'demo_seeded'
  );
