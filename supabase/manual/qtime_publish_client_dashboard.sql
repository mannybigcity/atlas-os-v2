-- One-time QTime Productions client dashboard publishing script
-- Run this after the QTime organization and Content Studio tables exist.
-- It publishes the pilot goal, first actions, and a ready-for-review work item
-- so Q sees an active workspace instead of an empty pilot shell.

begin;

do $$
declare
  v_organization_id uuid;
  v_deliverable_id uuid;
begin
  select id
    into v_organization_id
  from public.organizations
  where slug = 'qtime-productions';

  if v_organization_id is null then
    raise exception 'QTime Productions organization was not found';
  end if;

  insert into public.organization_pilot_plans (
    organization_id,
    thirty_day_goal,
    success_definition,
    next_check_in_at,
    status
  ) values (
    v_organization_id,
    'Install QTime Productions'' first visible Atlas operating loop: turn the Roll''n Wars and Food4Thought opportunities into organized content, sponsor follow-up, and client-reviewable work.',
    'QTime can review its business profile, see at least three Roll''n Wars content concepts, choose a direction, and track the next actions needed to move sponsorship and event promotion forward.',
    now() + interval '7 days',
    'active'
  )
  on conflict (organization_id) do update
  set
    thirty_day_goal = excluded.thirty_day_goal,
    success_definition = excluded.success_definition,
    next_check_in_at = excluded.next_check_in_at,
    status = excluded.status,
    updated_at = now();

  insert into public.organization_pilot_actions (
    organization_id,
    title,
    description,
    status,
    priority,
    owner_label,
    due_date
  )
  select
    v_organization_id,
    seed.title,
    seed.description,
    seed.status,
    seed.priority,
    seed.owner_label,
    current_date + seed.days_until_due
  from (
    values
      (
        'Choose the first Roll''n Wars content direction',
        'Review the three draft visual directions and pick the one closest to QTime''s desired style before final production details are added.',
        'in_progress',
        1::smallint,
        'QTime + Atlas',
        3
      ),
      (
        'Confirm missing event details',
        'Provide the next battle date, venue, participating food trucks, call to action, sponsor/logo permissions, and any required wording.',
        'not_started',
        2::smallint,
        'QTime',
        5
      ),
      (
        'Build sponsor follow-up list',
        'Organize warm sponsor opportunities such as US Foods, venue partners, and food-service brands so DAVID can keep follow-up from getting lost.',
        'not_started',
        3::smallint,
        'HUNTER + DAVID',
        7
      )
  ) as seed(title, description, status, priority, owner_label, days_until_due)
  where not exists (
    select 1
    from public.organization_pilot_actions existing
    where existing.organization_id = v_organization_id
      and existing.title = seed.title
  );

  select id
    into v_deliverable_id
  from public.organization_pilot_deliverables
  where organization_id = v_organization_id
    and title = 'Roll''n Wars content sample package'
  limit 1;

  if v_deliverable_id is null then
    insert into public.organization_pilot_deliverables (
      organization_id,
      title,
      summary,
      body,
      status
    ) values (
      v_organization_id,
      'Roll''n Wars content sample package',
      'Atlas and MICAH prepared three first-pass Roll''n Wars graphic directions plus social caption drafts for QTime review.',
      'QTime has three draft directions ready in the MICAH Content Studio: Broadcast Energy, Street Festival, and Premium Editorial. These drafts are intentionally concept-only and need QTime approval before any final post, outreach, or publishing step. Next decision: choose the strongest visual direction and confirm event details, participating food trucks, venue, date, sponsor usage, and call to action.',
      'ready_for_review'
    )
    returning id into v_deliverable_id;
  else
    update public.organization_pilot_deliverables
    set
      summary = 'Atlas and MICAH prepared three first-pass Roll''n Wars graphic directions plus social caption drafts for QTime review.',
      body = 'QTime has three draft directions ready in the MICAH Content Studio: Broadcast Energy, Street Festival, and Premium Editorial. These drafts are intentionally concept-only and need QTime approval before any final post, outreach, or publishing step. Next decision: choose the strongest visual direction and confirm event details, participating food trucks, venue, date, sponsor usage, and call to action.',
      status = 'ready_for_review',
      updated_at = now()
    where id = v_deliverable_id;
  end if;
end $$;

commit;
