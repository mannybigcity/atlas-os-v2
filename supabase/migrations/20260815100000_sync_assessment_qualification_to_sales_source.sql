-- Preserve the qualification answers captured by the public assessment in the
-- linked Atlas sales source record used by the review workflow.

create or replace function public.sync_business_assessment_sales_qualification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.atlas_sales_prospect_sources
  set facts = facts || jsonb_build_object(
    'monthly_lead_volume', new.monthly_lead_volume,
    'follow_up_speed', new.follow_up_speed,
    'pilot_budget', new.pilot_budget,
    'preferred_contact_method', new.preferred_contact_method
  )
  where source_type = 'business_assessment'
    and external_id = new.id::text;

  return new;
end;
$$;

drop trigger if exists business_assessments_sync_sales_qualification
  on public.business_assessment_submissions;
create trigger business_assessments_sync_sales_qualification
after insert on public.business_assessment_submissions
for each row execute function public.sync_business_assessment_sales_qualification();

revoke execute on function public.sync_business_assessment_sales_qualification()
from public, anon, authenticated;
