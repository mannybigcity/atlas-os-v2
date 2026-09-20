-- Lion's Den CRM files: invoices, contracts, and other documents stored on a
-- prospect or client record. Private per organization. Not emailed.

create table if not exists public.crm_record_files (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  record_table text not null
    check (record_table in ('opportunity', 'sis_customer')),
  record_id uuid not null,
  storage_path text not null
    check (length(btrim(storage_path)) between 20 and 600),
  file_name text not null
    check (length(btrim(file_name)) between 1 and 240),
  content_type text not null
    check (length(btrim(content_type)) between 3 and 180),
  byte_size integer not null
    check (byte_size > 0 and byte_size <= 10485760),
  label text not null default 'other'
    check (label in ('invoice', 'contract', 'other')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (storage_path),
  check (
    storage_path like (
      organization_id::text
      || '/'
      || record_table
      || '/'
      || record_id::text
      || '/'
      || id::text
      || '/%'
    )
  )
);

create index if not exists crm_record_files_record_idx
  on public.crm_record_files (organization_id, record_table, record_id, created_at desc);

alter table public.crm_record_files enable row level security;

drop policy if exists "Members can read crm record files" on public.crm_record_files;
create policy "Members can read crm record files"
on public.crm_record_files
for select
to authenticated
using (
  public.is_atlas_super_admin()
  or exists (
    select 1
    from public.organization_memberships memberships
    where memberships.organization_id = crm_record_files.organization_id
      and memberships.user_id = (select auth.uid())
  )
);

drop policy if exists "Members can insert crm record files" on public.crm_record_files;
create policy "Members can insert crm record files"
on public.crm_record_files
for insert
to authenticated
with check (
  public.is_atlas_super_admin()
  or (
    created_by = (select auth.uid())
    and exists (
      select 1
      from public.organization_memberships memberships
      where memberships.organization_id = crm_record_files.organization_id
        and memberships.user_id = (select auth.uid())
    )
  )
);

drop policy if exists "Members can delete crm record files" on public.crm_record_files;
create policy "Members can delete crm record files"
on public.crm_record_files
for delete
to authenticated
using (
  public.is_atlas_super_admin()
  or exists (
    select 1
    from public.organization_memberships memberships
    where memberships.organization_id = crm_record_files.organization_id
      and memberships.user_id = (select auth.uid())
  )
);

revoke all on table public.crm_record_files from public, anon, authenticated;
grant select, insert, delete on table public.crm_record_files to authenticated, service_role;

-- Private bucket. Path: {organization_id}/{record_table}/{record_id}/{file_id}/{file_name}
insert into storage.buckets (id, name, public, file_size_limit)
values ('crm-files', 'crm-files', false, 10485760)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit;

drop policy if exists "Members can read crm-files objects" on storage.objects;
create policy "Members can read crm-files objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'crm-files'
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

drop policy if exists "Members can insert crm-files objects" on storage.objects;
create policy "Members can insert crm-files objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'crm-files'
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

drop policy if exists "Members can update crm-files objects" on storage.objects;
create policy "Members can update crm-files objects"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'crm-files'
  and (
    public.is_atlas_super_admin()
    or exists (
      select 1
      from public.organization_memberships memberships
      where memberships.user_id = (select auth.uid())
        and memberships.organization_id::text = (storage.foldername(name))[1]
    )
  )
)
with check (
  bucket_id = 'crm-files'
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

drop policy if exists "Members can delete crm-files objects" on storage.objects;
create policy "Members can delete crm-files objects"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'crm-files'
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
