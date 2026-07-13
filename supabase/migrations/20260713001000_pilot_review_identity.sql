-- Atlas OS v2 - Pilot review identity
-- Records a trustworthy reviewer label for each client decision so the
-- Lion's Den can show who approved work, when, and with what note.

alter table public.organization_pilot_deliverable_reviews
add column if not exists reviewed_by_display_name text;

-- Preserve a readable identity for reviews created before this migration.
update public.organization_pilot_deliverable_reviews reviews
set reviewed_by_display_name = coalesce(
  nullif(btrim(users.raw_user_meta_data ->> 'display_name'), ''),
  nullif(btrim(users.raw_user_meta_data ->> 'full_name'), ''),
  nullif(lower(btrim(users.email)), ''),
  'Client reviewer'
)
from auth.users users
where users.id = reviews.reviewed_by
  and reviews.reviewed_by_display_name is null;

update public.organization_pilot_deliverable_reviews
set reviewed_by_display_name = 'Client reviewer'
where reviewed_by_display_name is null;

alter table public.organization_pilot_deliverable_reviews
alter column reviewed_by_display_name set not null;

create or replace function public.set_pilot_deliverable_reviewer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.reviewed_by = auth.uid();
  new.reviewed_at = now();

  select coalesce(
    nullif(btrim(users.raw_user_meta_data ->> 'display_name'), ''),
    nullif(btrim(users.raw_user_meta_data ->> 'full_name'), ''),
    nullif(lower(btrim(users.email)), ''),
    'Client reviewer'
  )
  into new.reviewed_by_display_name
  from auth.users users
  where users.id = auth.uid();

  new.reviewed_by_display_name = coalesce(
    new.reviewed_by_display_name,
    'Client reviewer'
  );

  return new;
end;
$$;

drop trigger if exists organization_pilot_reviews_set_reviewer
  on public.organization_pilot_deliverable_reviews;
create trigger organization_pilot_reviews_set_reviewer
before insert or update on public.organization_pilot_deliverable_reviews
for each row execute function public.set_pilot_deliverable_reviewer();

-- This function is trigger-only and must not be callable through the RPC API.
revoke execute on function public.set_pilot_deliverable_reviewer()
from public, anon, authenticated;
