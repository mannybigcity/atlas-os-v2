-- Remove overlapping SIS SELECT policies and separate manager writes.
-- This keeps read access member-scoped while avoiding duplicate permissive
-- policies reported by Supabase advisors.

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'organization_sis_quotes',
    'organization_sis_quote_items',
    'organization_sis_orders',
    'organization_sis_order_items',
    'organization_sis_fulfillment_jobs'
  ] loop
    execute format(
      'drop policy if exists %I on public.%I',
      format('SIS managers can manage %s', table_name), table_name
    );

    execute format(
      'drop policy if exists %I on public.%I',
      format('SIS managers can create %s', table_name), table_name
    );

    execute format(
      'drop policy if exists %I on public.%I',
      format('SIS managers can update %s', table_name), table_name
    );

    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.is_atlas_super_admin() or exists (select 1 from public.organization_memberships memberships where memberships.organization_id = %I.organization_id and memberships.user_id = auth.uid() and memberships.role in (''owner'', ''admin'')))',
      format('SIS managers can create %s', table_name), table_name, table_name
    );

    execute format(
      'create policy %I on public.%I for update to authenticated using (public.is_atlas_super_admin() or exists (select 1 from public.organization_memberships memberships where memberships.organization_id = %I.organization_id and memberships.user_id = auth.uid() and memberships.role in (''owner'', ''admin''))) with check (public.is_atlas_super_admin() or exists (select 1 from public.organization_memberships memberships where memberships.organization_id = %I.organization_id and memberships.user_id = auth.uid() and memberships.role in (''owner'', ''admin'')))',
      format('SIS managers can update %s', table_name), table_name, table_name, table_name
    );
  end loop;
end
$$;
