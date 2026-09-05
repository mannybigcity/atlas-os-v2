-- Trial Lion's Den seed writes HUNTER review-pile rows and MICAH gallery
-- placeholders with the service role during workspace ensure. RLS is bypassed
-- for service_role, but table GRANTs are still required.

grant select, insert, update on table public.organization_hunter_review_items to service_role;
grant select, insert, update on table public.organization_content_drafts to service_role;
grant select, insert on table public.organization_content_draft_events to service_role;
