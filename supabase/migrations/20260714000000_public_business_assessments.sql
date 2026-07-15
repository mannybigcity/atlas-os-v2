-- Atlas OS v2 - Public business assessment intake
-- Accepts new assessment requests without exposing prospect information.

create table if not exists public.business_assessment_submissions (
  id uuid primary key default gen_random_uuid(),
  business_description text not null
    check (length(btrim(business_description)) between 10 and 3000),
  ideal_customer text not null
    check (length(btrim(ideal_customer)) between 3 and 1500),
  customer_sources text[] not null
    check (
      cardinality(customer_sources) between 1 and 10
      and customer_sources <@ array[
        'referrals', 'facebook', 'instagram', 'google', 'website',
        'walk_ins', 'networking', 'repeat_customers', 'paid_ads', 'other'
      ]::text[]
    ),
  biggest_challenge text not null check (
    biggest_challenge in (
      'finding_customers', 'getting_customers_to_buy', 'not_enough_time',
      'too_much_manual_work', 'hiring', 'cash_flow', 'marketing',
      'keeping_customers', 'growing_the_business', 'other'
    )
  ),
  ninety_day_goal text not null
    check (length(btrim(ninety_day_goal)) between 5 and 2000),
  evaluation_areas text[] not null
    check (
      cardinality(evaluation_areas) between 1 and 12
      and evaluation_areas <@ array[
        'sales', 'marketing', 'operations', 'customer_service', 'pricing',
        'automation', 'ai', 'website', 'branding', 'hiring', 'finance',
        'technology'
      ]::text[]
    ),
  business_size text not null
    check (business_size in ('just_me', '2_5', '6_15', '16_50', '50_plus')),
  ai_tools text[] not null
    check (
      cardinality(ai_tools) between 1 and 6
      and ai_tools <@ array[
        'none', 'chatgpt', 'claude', 'gemini', 'copilot', 'multiple'
      ]::text[]
    ),
  improvement_timing text not null
    check (improvement_timing in ('immediately', '30_days', '90_days', 'exploring')),
  contact_name text not null check (length(btrim(contact_name)) between 2 and 200),
  contact_email text not null check (
    length(btrim(contact_email)) between 5 and 320
    and position('@' in contact_email) > 1
  ),
  contact_phone text not null check (length(btrim(contact_phone)) between 7 and 50),
  business_name text not null check (length(btrim(business_name)) between 2 and 250),
  website text,
  consent_to_contact boolean not null default false check (consent_to_contact),
  status text not null default 'new'
    check (status in ('new', 'contacted', 'qualified', 'not_a_fit', 'converted')),
  source text not null default 'atlas_website' check (source = 'atlas_website'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_assessments_status_created_idx
  on public.business_assessment_submissions(status, created_at desc);

drop trigger if exists business_assessments_set_updated_at
  on public.business_assessment_submissions;
create trigger business_assessments_set_updated_at
before update on public.business_assessment_submissions
for each row execute function public.set_updated_at();

alter table public.business_assessment_submissions enable row level security;

drop policy if exists "Anyone can submit a business assessment"
  on public.business_assessment_submissions;
create policy "Anyone can submit a business assessment"
on public.business_assessment_submissions
for insert
to anon, authenticated
with check (
  consent_to_contact
  and status = 'new'
  and source = 'atlas_website'
);

drop policy if exists "Atlas Admin can read business assessments"
  on public.business_assessment_submissions;
create policy "Atlas Admin can read business assessments"
on public.business_assessment_submissions
for select
to authenticated
using (public.is_atlas_super_admin());

drop policy if exists "Atlas Admin can update business assessments"
  on public.business_assessment_submissions;
create policy "Atlas Admin can update business assessments"
on public.business_assessment_submissions
for update
to authenticated
using (public.is_atlas_super_admin())
with check (public.is_atlas_super_admin());

revoke all on table public.business_assessment_submissions from public, anon, authenticated;
grant insert on table public.business_assessment_submissions to anon, authenticated;
grant select, update on table public.business_assessment_submissions to authenticated;

-- No delete policy is provided. Lead history is retained.
