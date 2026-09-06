-- Denser new-trial seed writes SAMPLE Prospects and owner-approval follow-up
-- drafts with the service role during workspace ensure. RLS is bypassed for
-- service_role, but table GRANTs are still required. Do not touch SIS.

grant select, insert, update on table public.organization_opportunities to service_role;
grant select, insert on table public.organization_opportunity_events to service_role;
