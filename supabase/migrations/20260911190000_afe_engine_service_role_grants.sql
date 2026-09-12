-- Overnight-engine (Netlify) writes with SUPABASE_SERVICE_ROLE_KEY.
-- RLS is bypassed for service_role, but table GRANTs are still required.
-- Follow-up to 20260909140000_afe_engine.sql (already shipped).

grant select, insert, update on table public.engine_runs to service_role;
grant select, insert, update on table public.engine_drafts to service_role;
grant select, insert, update on table public.morning_briefs to service_role;
grant select on table public.atlas_sales_prospects to service_role;
grant select on table public.atlas_contact_suppressions to service_role;
