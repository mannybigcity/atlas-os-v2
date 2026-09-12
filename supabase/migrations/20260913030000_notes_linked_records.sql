-- A desk note can be about one prospect or client. record_name is kept on the
-- note so the board can show it without joining two different record tables.
alter table public.organization_notes
  add column if not exists record_kind text
    check (record_kind is null or record_kind in ('prospect', 'client', 'sis_customer')),
  add column if not exists record_id uuid,
  add column if not exists record_name text
    check (record_name is null or length(btrim(record_name)) between 1 and 240),
  add column if not exists note_type text
    check (note_type is null or note_type in ('general', 'follow-up', 'call', 'meeting')),
  add column if not exists due_date date;

create index if not exists organization_notes_record_idx
  on public.organization_notes(organization_id, record_id, created_at desc)
  where record_id is not null;
