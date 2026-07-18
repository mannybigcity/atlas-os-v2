-- One-time QTime Productions business profile setup
-- Prepared from Quincy's approved Claude response.
-- Run this file in the Supabase SQL Editor for the Atlas Operating System project.

begin;

do $$
declare
  v_organization_id uuid;
begin
  select id
    into v_organization_id
  from public.organizations
  where slug = 'qtime-productions';

  if v_organization_id is null then
    raise exception 'QTime Productions organization was not found';
  end if;

  insert into public.business_profiles (
    organization_id,
    offer,
    target_customer,
    positioning,
    current_goals,
    constraints
  ) values (
    v_organization_id,
    'QTime Productions ("To be on Q") is a Denver-based media production company spanning marketing strategy, brand promotions, and film/reality production. Core offerings include original content properties such as Roll''n Wars, a food truck competition series, and Food4Thought Network, a culinary interview and recipe series. QTime also provides social content packages, host scripts, sponsorship outreach support, branded documents, and website and marketing collateral.',
    'Food trucks, restaurants, and local culinary businesses in the Denver and Colorado market seeking exposure through competition-style content; brand sponsors seeking relevant audience access; musical artists and small businesses needing social content packages; and event venues seeking audience draw.',
    'QTime combines entertainment-focused production with hands-on marketing execution. Its working model brings multi-location production, host and judging formats, social content, branded documents, and sponsorship packaging together so a customer does not need to coordinate several separate production and marketing vendors.',
    'Launch Food4Thought Network Season 1 across YouTube, TikTok, and Instagram; continue growing Roll''n Wars events; turn qualified warm sponsor opportunities into clear next steps; and strengthen QTP LLC''s business-credit readiness.',
    'QTime operates with a lean founder-led team while balancing scripts, shoots, editing, and marketing across several platforms. Current constraints include turning sponsorship conversations into signed agreements, maintaining consistent execution across active productions, and limited working capital during the current growth stage.'
  )
  on conflict (organization_id) do update set
    offer = excluded.offer,
    target_customer = excluded.target_customer,
    positioning = excluded.positioning,
    current_goals = excluded.current_goals,
    constraints = excluded.constraints;
end
$$;

commit;

select
  organizations.name as organization,
  organizations.slug,
  business_profiles.offer,
  business_profiles.target_customer,
  business_profiles.positioning,
  business_profiles.current_goals,
  business_profiles.constraints,
  business_profiles.updated_at
from public.business_profiles
join public.organizations
  on organizations.id = business_profiles.organization_id
where organizations.slug = 'qtime-productions';
