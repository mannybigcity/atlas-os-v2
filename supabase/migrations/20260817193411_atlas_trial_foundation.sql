create table if not exists public.atlas_trial_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 160),
  business_name text not null check (char_length(business_name) between 2 and 200),
  email text not null,
  phone text not null check (char_length(phone) between 7 and 40),
  business_type text not null check (char_length(business_type) between 2 and 100),
  primary_growth_goal text not null check (char_length(primary_growth_goal) between 2 and 1000),
  terms_accepted_at timestamptz not null,
  privacy_accepted_at timestamptz not null,
  trial_started_at timestamptz not null default now(),
  trial_ends_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.atlas_trial_profiles enable row level security;

drop policy if exists "Trial owners can read their profile" on public.atlas_trial_profiles;
create policy "Trial owners can read their profile"
on public.atlas_trial_profiles
for select
to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.atlas_trial_profiles from anon;
revoke all on table public.atlas_trial_profiles from authenticated;
grant select on table public.atlas_trial_profiles to authenticated;

create index if not exists atlas_trial_profiles_trial_ends_at_idx
  on public.atlas_trial_profiles (trial_ends_at);
