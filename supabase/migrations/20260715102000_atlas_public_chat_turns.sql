-- Atlas OS v2 - Public Atlas chat capture
-- Stores public preview questions and Atlas replies so beta traffic becomes usable product data.

create table if not exists public.atlas_public_chat_turns (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  source text not null default 'homepage_chat'
    check (source = 'homepage_chat'),
  page_path text not null default '/'
    check (length(btrim(page_path)) between 1 and 200),
  prompt text not null
    check (length(btrim(prompt)) between 1 and 4000),
  response jsonb not null default '{}'::jsonb
    check (jsonb_typeof(response) = 'object'),
  model text
    check (model is null or length(btrim(model)) between 1 and 150),
  response_id text
    check (response_id is null or length(btrim(response_id)) between 1 and 150),
  status text not null default 'succeeded'
    check (status in ('succeeded', 'blocked', 'failed')),
  input_tokens integer not null default 0
    check (input_tokens >= 0),
  cached_input_tokens integer not null default 0
    check (cached_input_tokens >= 0 and cached_input_tokens <= input_tokens),
  output_tokens integer not null default 0
    check (output_tokens >= 0),
  reasoning_tokens integer not null default 0
    check (reasoning_tokens >= 0 and reasoning_tokens <= output_tokens),
  estimated_cost_microusd bigint not null default 0
    check (estimated_cost_microusd >= 0),
  error_code text
    check (error_code is null or length(btrim(error_code)) between 1 and 150),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists atlas_public_chat_turns_session_created_idx
  on public.atlas_public_chat_turns(session_id, created_at desc);

create index if not exists atlas_public_chat_turns_created_idx
  on public.atlas_public_chat_turns(created_at desc);

alter table public.atlas_public_chat_turns enable row level security;

drop policy if exists "Atlas Admin can read public chat turns"
  on public.atlas_public_chat_turns;
create policy "Atlas Admin can read public chat turns"
on public.atlas_public_chat_turns
for select
to authenticated
using (public.is_atlas_super_admin());

drop policy if exists "Anyone can capture a public chat turn"
  on public.atlas_public_chat_turns;
create policy "Anyone can capture a public chat turn"
on public.atlas_public_chat_turns
for insert
to anon, authenticated
with check (source = 'homepage_chat');

revoke all on table public.atlas_public_chat_turns
from public, anon, authenticated;

grant insert on table public.atlas_public_chat_turns
to anon, authenticated;
grant select on table public.atlas_public_chat_turns
to authenticated;

-- No public update or delete access is granted. The chat log is retained.
