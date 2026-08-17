create table if not exists public.atlas_sales_tasks (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.atlas_sales_prospects(id) on delete restrict,
  title text not null check (length(btrim(title)) between 2 and 250),
  details text check (details is null or length(btrim(details)) between 1 and 5000),
  task_type text not null default 'follow_up'
    check (task_type in ('follow_up', 'call', 'email', 'meeting', 'research', 'review', 'other')),
  status text not null default 'open'
    check (status in ('open', 'completed', 'cancelled')),
  due_at timestamptz,
  completed_at timestamptz,
  assigned_role text not null default 'david'
    check (assigned_role in ('manny', 'atlas', 'hunter', 'micah', 'david')),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'completed' and completed_at is not null) or (status <> 'completed'))
);

create index if not exists atlas_sales_tasks_due_idx
  on public.atlas_sales_tasks(due_at)
  where status = 'open' and due_at is not null;
create index if not exists atlas_sales_tasks_prospect_idx
  on public.atlas_sales_tasks(prospect_id, created_at desc);

drop trigger if exists atlas_sales_tasks_set_updated_at on public.atlas_sales_tasks;
create trigger atlas_sales_tasks_set_updated_at
before update on public.atlas_sales_tasks
for each row execute function public.set_updated_at();

alter table public.atlas_sales_tasks enable row level security;

drop policy if exists "Atlas Admin can read sales tasks" on public.atlas_sales_tasks;
create policy "Atlas Admin can read sales tasks"
on public.atlas_sales_tasks for select to authenticated
using (public.is_atlas_super_admin());

drop policy if exists "Atlas Admin can create sales tasks" on public.atlas_sales_tasks;
create policy "Atlas Admin can create sales tasks"
on public.atlas_sales_tasks for insert to authenticated
with check (public.is_atlas_super_admin());

drop policy if exists "Atlas Admin can update sales tasks" on public.atlas_sales_tasks;
create policy "Atlas Admin can update sales tasks"
on public.atlas_sales_tasks for update to authenticated
using (public.is_atlas_super_admin())
with check (public.is_atlas_super_admin());

revoke all on table public.atlas_sales_tasks from public, anon, authenticated;
grant select, insert, update on table public.atlas_sales_tasks to authenticated;
