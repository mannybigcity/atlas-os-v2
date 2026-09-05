-- Idempotent UPDATE-only fixture for the live AFE Lion's Den operator desk.
-- Does not insert organizations or contacts. Does not touch SIS, QTIME, or afe-crm-demo.
-- Re-running this file must not re-label rows DEMO and must not rename the sample org.

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

  update public.organization_opportunities
  set
    name = regexp_replace(regexp_replace(name, '\s*\(\s*demo\s*\)', '', 'gi'), '(^|[[:space:]])demo[[:space:]]*:[[:space:]]*', '\1', 'gi'),
    next_action = case
      when next_action is null then null
      when length(btrim(regexp_replace(regexp_replace(next_action, '\s*\(\s*demo\s*\)', '', 'gi'), '(^|[[:space:]])demo[[:space:]]*:[[:space:]]*', '\1', 'gi'))) >= 5
        then regexp_replace(regexp_replace(next_action, '\s*\(\s*demo\s*\)', '', 'gi'), '(^|[[:space:]])demo[[:space:]]*:[[:space:]]*', '\1', 'gi')
      else next_action
    end
  where organization_id = v_org_id
    and (
      name ~* 'demo'
      or coalesce(next_action, '') ~* 'demo'
    );
end
$$;
