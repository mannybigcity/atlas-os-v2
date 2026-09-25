-- SignScout device ingest into the AFE HUNTER review pile.
-- This file is NOT applied by the application or by CI.
-- The founder applies it once in the Supabase SQL editor after review.
--
-- SignScout rows stay status = pending until a person taps Accept.
-- This migration does not write SIS tenant leads or the public capture card,
-- and it does not send email, SMS, or outreach.

alter table public.organization_hunter_review_items
  add column if not exists source text not null default 'google_places';

alter table public.organization_hunter_review_items
  drop constraint if exists organization_hunter_review_items_source_check;

alter table public.organization_hunter_review_items
  add constraint organization_hunter_review_items_source_check
  check (source in ('google_places', 'signscout'));

alter table public.organization_hunter_review_items
  add column if not exists notes text;

alter table public.organization_hunter_review_items
  drop constraint if exists organization_hunter_review_items_notes_check;

alter table public.organization_hunter_review_items
  add constraint organization_hunter_review_items_notes_check
  check (notes is null or length(btrim(notes)) between 1 and 4000);

alter table public.organization_hunter_review_items
  add column if not exists contact_email text;

alter table public.organization_hunter_review_items
  drop constraint if exists organization_hunter_review_items_contact_email_check;

alter table public.organization_hunter_review_items
  add constraint organization_hunter_review_items_contact_email_check
  check (contact_email is null or length(btrim(contact_email)) between 3 and 254);

alter table public.organization_hunter_review_items
  add column if not exists latitude double precision;

alter table public.organization_hunter_review_items
  drop constraint if exists organization_hunter_review_items_latitude_check;

alter table public.organization_hunter_review_items
  add constraint organization_hunter_review_items_latitude_check
  check (latitude is null or (latitude >= -90 and latitude <= 90));

alter table public.organization_hunter_review_items
  add column if not exists longitude double precision;

alter table public.organization_hunter_review_items
  drop constraint if exists organization_hunter_review_items_longitude_check;

alter table public.organization_hunter_review_items
  add constraint organization_hunter_review_items_longitude_check
  check (longitude is null or (longitude >= -180 and longitude <= 180));

alter table public.organization_hunter_review_items
  drop constraint if exists organization_hunter_review_items_lat_lng_pair_check;

alter table public.organization_hunter_review_items
  add constraint organization_hunter_review_items_lat_lng_pair_check
  check (
    (latitude is null and longitude is null)
    or (latitude is not null and longitude is not null)
  );

alter table public.organization_hunter_review_items
  add column if not exists photo_storage_path text;

alter table public.organization_hunter_review_items
  drop constraint if exists organization_hunter_review_items_photo_path_check;

alter table public.organization_hunter_review_items
  add constraint organization_hunter_review_items_photo_path_check
  check (photo_storage_path is null or length(btrim(photo_storage_path)) between 3 and 500);

alter table public.organization_hunter_review_items
  add column if not exists photo_content_type text;

alter table public.organization_hunter_review_items
  drop constraint if exists organization_hunter_review_items_photo_type_check;

alter table public.organization_hunter_review_items
  add constraint organization_hunter_review_items_photo_type_check
  check (
    photo_content_type is null
    or photo_content_type in ('image/jpeg', 'image/png', 'image/webp')
  );

alter table public.organization_hunter_review_items
  add column if not exists idempotency_key text;

alter table public.organization_hunter_review_items
  drop constraint if exists organization_hunter_review_items_idempotency_key_check;

alter table public.organization_hunter_review_items
  add constraint organization_hunter_review_items_idempotency_key_check
  check (idempotency_key is null or length(btrim(idempotency_key)) between 8 and 80);

alter table public.organization_hunter_review_items
  add column if not exists body_fingerprint text;

alter table public.organization_hunter_review_items
  drop constraint if exists organization_hunter_review_items_body_fingerprint_check;

alter table public.organization_hunter_review_items
  add constraint organization_hunter_review_items_body_fingerprint_check
  check (body_fingerprint is null or length(btrim(body_fingerprint)) = 64);

alter table public.organization_hunter_review_items
  drop constraint if exists organization_hunter_review_items_source_idempotency_check;

alter table public.organization_hunter_review_items
  add constraint organization_hunter_review_items_source_idempotency_check
  check (
    (
      source = 'google_places'
      and idempotency_key is null
      and body_fingerprint is null
    )
    or (
      source = 'signscout'
      and idempotency_key is not null
      and body_fingerprint is not null
    )
  );

create unique index if not exists organization_hunter_review_signscout_idempotency_uidx
  on public.organization_hunter_review_items (organization_id, idempotency_key)
  where idempotency_key is not null;

-- Hashed SignScout device tokens. Plaintext is shown once in the desk UI
-- and is never stored. A token whose organization is not the AFE operator
-- desk is refused by the ingest route even if a row exists.
create table if not exists public.organization_signscout_device_tokens (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  label text not null
    check (length(btrim(label)) between 1 and 80),
  token_hash text not null unique
    check (length(token_hash) = 64),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index if not exists organization_signscout_device_tokens_org_idx
  on public.organization_signscout_device_tokens (organization_id, created_at desc);

alter table public.organization_signscout_device_tokens enable row level security;

drop policy if exists "Desk admins can read SignScout device tokens"
  on public.organization_signscout_device_tokens;
create policy "Desk admins can read SignScout device tokens"
on public.organization_signscout_device_tokens
for select
to authenticated
using (
  public.is_atlas_super_admin()
  or exists (
    select 1
    from public.organization_memberships memberships
    where memberships.organization_id = organization_signscout_device_tokens.organization_id
      and memberships.user_id = (select auth.uid())
      and memberships.role in ('owner', 'admin')
  )
);

revoke all on table public.organization_signscout_device_tokens
from public, anon, authenticated;
grant select on table public.organization_signscout_device_tokens to authenticated;
grant select, insert, update, delete on table public.organization_signscout_device_tokens to service_role;

-- Service-role audit log for POST /api/signscout/ingest. No browser grants.
create table if not exists public.signscout_ingest_attempts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  token_id uuid references public.organization_signscout_device_tokens(id) on delete set null,
  idempotency_key text
    check (idempotency_key is null or length(btrim(idempotency_key)) between 8 and 80),
  outcome text not null
    check (
      outcome in (
        'created',
        'replay',
        'invalid_request',
        'unauthorized',
        'forbidden',
        'rate_limited',
        'idempotency_conflict',
        'failed'
      )
    ),
  outcome_reason text
    check (outcome_reason is null or length(btrim(outcome_reason)) between 2 and 2000),
  review_item_id uuid references public.organization_hunter_review_items(id) on delete set null,
  fingerprint text not null
    check (length(btrim(fingerprint)) = 64),
  ip_hash text
    check (ip_hash is null or length(btrim(ip_hash)) = 64),
  user_agent text
    check (user_agent is null or length(btrim(user_agent)) between 2 and 512),
  created_at timestamptz not null default now()
);

create index if not exists signscout_ingest_attempts_token_created_idx
  on public.signscout_ingest_attempts (token_id, created_at desc)
  where token_id is not null;

create index if not exists signscout_ingest_attempts_ip_created_idx
  on public.signscout_ingest_attempts (ip_hash, created_at desc)
  where ip_hash is not null;

alter table public.signscout_ingest_attempts enable row level security;

revoke all on table public.signscout_ingest_attempts from public, anon, authenticated;
grant select, insert on table public.signscout_ingest_attempts to service_role;

-- Private photos. Path: {organization_id}/{review_item_id}.{jpg|png|webp}
-- Decoded file cap is 3,500,000 bytes so the base64 JSON body stays under
-- the host request limit. The bucket is not public.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'signscout-photos',
  'signscout-photos',
  false,
  3500000,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Members can read signscout-photos objects" on storage.objects;
create policy "Members can read signscout-photos objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'signscout-photos'
  and (
    public.is_atlas_super_admin()
    or exists (
      select 1
      from public.organization_memberships memberships
      where memberships.user_id = (select auth.uid())
        and memberships.organization_id::text = (storage.foldername(name))[1]
    )
  )
);
