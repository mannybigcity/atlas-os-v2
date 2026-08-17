grant insert (
  user_id,
  full_name,
  business_name,
  email,
  phone,
  business_type,
  primary_growth_goal,
  terms_accepted_at,
  privacy_accepted_at
)
on public.atlas_trial_profiles to authenticated;

drop policy if exists "Trial owners can create their profile" on public.atlas_trial_profiles;
create policy "Trial owners can create their profile"
on public.atlas_trial_profiles
for insert
to authenticated
with check ((select auth.uid()) = user_id);
