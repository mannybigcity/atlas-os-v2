-- Atlas OS v2 - Add ORACLE to the private agent ledger role list
-- ORACLE is the Kingdom Intelligence and Trend Watchtower.

do $$
begin
  if to_regclass('public.atlas_agent_runs') is not null then
    alter table public.atlas_agent_runs
      drop constraint if exists atlas_agent_runs_role_check;

    alter table public.atlas_agent_runs
      add constraint atlas_agent_runs_role_check
      check (role in ('atlas', 'hunter', 'micah', 'david', 'oracle'));
  end if;
end;
$$;
