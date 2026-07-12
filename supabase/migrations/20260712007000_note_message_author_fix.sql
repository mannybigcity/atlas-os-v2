-- Atlas OS v2 - Note message author display-name fix
-- Reads current Auth metadata instead of possibly stale JWT metadata.

create or replace function public.set_note_message_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_email text;
  current_display_name text;
begin
  new.author_user_id = auth.uid();

  select
    lower(coalesce(users.email, '')),
    nullif(btrim(coalesce(users.raw_user_meta_data ->> 'display_name', '')), '')
  into current_email, current_display_name
  from auth.users users
  where users.id = auth.uid();

  if current_email = 'info@atlasforentrepreneurs.com' then
    new.author_kind = 'atlas_admin';
    new.author_display_name = 'Atlas Admin';
  else
    new.author_kind = 'client';
    new.author_display_name = coalesce(
      case
        when lower(current_display_name) = 'atlas admin' then null
        else current_display_name
      end,
      nullif(split_part(current_email, '@', 1), ''),
      'Client member'
    );
  end if;

  return new;
end;
$$;

-- Correct existing client labels using their current saved display names.
update public.note_messages messages
set author_display_name = coalesce(
  case
    when lower(nullif(btrim(users.raw_user_meta_data ->> 'display_name'), '')) = 'atlas admin'
      then null
    else nullif(btrim(users.raw_user_meta_data ->> 'display_name'), '')
  end,
  nullif(split_part(lower(coalesce(users.email, '')), '@', 1), ''),
  'Client member'
)
from auth.users users
where users.id = messages.author_user_id
  and messages.author_kind = 'client';

