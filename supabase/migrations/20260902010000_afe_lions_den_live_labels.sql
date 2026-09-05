-- Strip leftover DEMO labels from the live AFE Lion's Den operator desk.
-- Scoped to slug atlas-for-entrepreneurs ONLY. Does not delete rows.
-- Does not rename the operator org to Atlas.
-- Does not touch afe-crm-demo (sample / Show-the-desk), SIS, QTIME, or any other tenant.

create or replace function public.strip_visible_demo_label(value text)
returns text
language sql
immutable
as $$
  select nullif(btrim(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            coalesce(value, ''),
            '\s*\(\s*demo\s*\)',
            '',
            'gi'
          ),
          '(^|[[:space:]])demo[[:space:]]*:[[:space:]]*',
          '\1',
          'gi'
        ),
        '\ydemo\+',
        '',
        'gi'
      ),
      '\ydemo\y',
      '',
      'gi'
    )
  ), '');
$$;

do $$
declare
  v_org_id uuid;
begin
  select id
  into v_org_id
  from public.organizations
  where slug ilike 'atlas-for-entrepreneurs'
    and slug not ilike 'afe-crm-demo'
  limit 1;

  if v_org_id is null then
    return;
  end if;

  update public.organization_opportunities o
  set
    name = coalesce(nullif(public.strip_visible_demo_label(o.name), ''), o.name),
    next_action = case
      when o.next_action is null then null
      when length(btrim(coalesce(public.strip_visible_demo_label(o.next_action), ''))) >= 5
        then public.strip_visible_demo_label(o.next_action)
      else o.next_action
    end,
    research_summary = case
      when length(btrim(coalesce(public.strip_visible_demo_label(o.research_summary), ''))) >= 10
        then public.strip_visible_demo_label(o.research_summary)
      else o.research_summary
    end,
    fit_reason = case
      when o.fit_reason is null then null
      when length(btrim(coalesce(public.strip_visible_demo_label(o.fit_reason), ''))) >= 10
        then public.strip_visible_demo_label(o.fit_reason)
      else o.fit_reason
    end,
    source_label = case
      when o.source_label is null then null
      when length(btrim(coalesce(public.strip_visible_demo_label(o.source_label), ''))) >= 2
        then public.strip_visible_demo_label(o.source_label)
      else o.source_label
    end,
    contact_name = case
      when o.contact_name is null then null
      when length(btrim(coalesce(public.strip_visible_demo_label(o.contact_name), ''))) >= 2
        then public.strip_visible_demo_label(o.contact_name)
      else o.contact_name
    end,
    contact_email = case
      when o.contact_email is null then null
      when public.strip_visible_demo_label(o.contact_email) ~ '@'
        and length(btrim(public.strip_visible_demo_label(o.contact_email))) between 5 and 320
        then public.strip_visible_demo_label(o.contact_email)
      else o.contact_email
    end
  where o.organization_id = v_org_id
    and not exists (
      select 1
      from public.organization_opportunities other
      where other.organization_id = o.organization_id
        and other.id <> o.id
        and other.opportunity_type = o.opportunity_type
        and other.name = coalesce(nullif(public.strip_visible_demo_label(o.name), ''), o.name)
    );

  update public.organization_opportunity_events e
  set
    summary = coalesce(nullif(public.strip_visible_demo_label(e.summary), ''), e.summary),
    body = case
      when e.body is null then null
      else coalesce(nullif(public.strip_visible_demo_label(e.body), ''), e.body)
    end
  where e.organization_id = v_org_id;

  update public.organization_notes n
  set
    title = coalesce(nullif(public.strip_visible_demo_label(n.title), ''), n.title),
    body = case
      when n.body is null then null
      else coalesce(nullif(public.strip_visible_demo_label(n.body), ''), n.body)
    end
  where n.organization_id = v_org_id;

  if to_regclass('public.note_messages') is not null then
    update public.note_messages m
    set
      author_display_name = coalesce(nullif(public.strip_visible_demo_label(m.author_display_name), ''), m.author_display_name),
      body = coalesce(nullif(public.strip_visible_demo_label(m.body), ''), m.body)
    where m.note_id in (
      select n.id
      from public.organization_notes n
      where n.organization_id = v_org_id
    );
  end if;

  if to_regclass('public.organization_hunter_review_items') is not null then
    update public.organization_hunter_review_items h
    set
      name = coalesce(nullif(public.strip_visible_demo_label(h.name), ''), h.name),
      search_query = coalesce(nullif(public.strip_visible_demo_label(h.search_query), ''), h.search_query),
      formatted_address = case
        when h.formatted_address is null then null
        else coalesce(nullif(public.strip_visible_demo_label(h.formatted_address), ''), h.formatted_address)
      end,
      business_status = case
        when h.business_status is null then null
        else coalesce(nullif(public.strip_visible_demo_label(h.business_status), ''), h.business_status)
      end
    where h.organization_id = v_org_id;
  end if;

  if to_regclass('public.organization_content_drafts') is not null then
    update public.organization_content_drafts d
    set
      campaign = coalesce(nullif(public.strip_visible_demo_label(d.campaign), ''), d.campaign),
      title = coalesce(nullif(public.strip_visible_demo_label(d.title), ''), d.title),
      headline = coalesce(nullif(public.strip_visible_demo_label(d.headline), ''), d.headline),
      supporting_text = case
        when d.supporting_text is null then null
        when length(btrim(coalesce(public.strip_visible_demo_label(d.supporting_text), ''))) >= 2
          then public.strip_visible_demo_label(d.supporting_text)
        else d.supporting_text
      end,
      caption = case
        when length(btrim(coalesce(public.strip_visible_demo_label(d.caption), ''))) >= 10
          then public.strip_visible_demo_label(d.caption)
        else d.caption
      end,
      call_to_action = case
        when d.call_to_action is null then null
        when length(btrim(coalesce(public.strip_visible_demo_label(d.call_to_action), ''))) >= 2
          then public.strip_visible_demo_label(d.call_to_action)
        else d.call_to_action
      end,
      image_svg = case
        when d.image_svg is null then null
        else coalesce(nullif(public.strip_visible_demo_label(d.image_svg), ''), d.image_svg)
      end
    where d.organization_id = v_org_id;
  end if;

  if to_regclass('public.organization_content_draft_events') is not null then
    update public.organization_content_draft_events e
    set
      note = case
        when e.note is null then null
        else coalesce(nullif(public.strip_visible_demo_label(e.note), ''), e.note)
      end,
      actor_label = coalesce(nullif(public.strip_visible_demo_label(e.actor_label), ''), e.actor_label)
    where e.organization_id = v_org_id;
  end if;

  if to_regclass('public.organization_ai_requests') is not null then
    update public.organization_ai_requests r
    set
      prompt = coalesce(nullif(public.strip_visible_demo_label(r.prompt), ''), r.prompt),
      response = coalesce(nullif(public.strip_visible_demo_label(r.response), ''), r.response)
    where r.organization_id = v_org_id;
  end if;
end
$$;

drop function if exists public.strip_visible_demo_label(text);
