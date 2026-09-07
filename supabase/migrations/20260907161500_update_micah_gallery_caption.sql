-- Trial owners can save a MICAH gallery caption without Super Admin RLS.
-- Gallery-only: never publishes, never schedules. SIS orgs cannot save.

create or replace function public.update_micah_gallery_caption(
  p_draft_id uuid,
  p_organization_id uuid,
  p_caption text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_name text;
  v_org_slug text;
  v_caption text;
  v_status text;
  v_metadata jsonb;
begin
  if auth.uid() is null and coalesce(auth.role(), '') is distinct from 'service_role' then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;

  select name, slug into v_org_name, v_org_slug
  from public.organizations
  where id = p_organization_id;

  if v_org_name is null then
    raise exception 'Organization is missing' using errcode = 'P0002';
  end if;

  if v_org_name ~* 'sis\s*custom\s*creations'
    or v_org_name ~* 'sis[-_\s]?diy'
    or coalesce(v_org_slug, '') ~* 'sis-diy'
  then
    raise exception 'SIS gallery captions cannot be saved' using errcode = '42501';
  end if;

  if coalesce(auth.role(), '') is distinct from 'service_role'
    and not public.is_atlas_super_admin()
    and not exists (
      select 1
      from public.organization_memberships memberships
      where memberships.organization_id = p_organization_id
        and memberships.user_id = auth.uid()
        and memberships.role in ('owner', 'admin', 'member')
    )
  then
    raise exception 'Workspace membership is required' using errcode = '42501';
  end if;

  -- App already clipped the caption. Store it as passed so the writer can match.
  v_caption := coalesce(p_caption, '');
  if char_length(btrim(v_caption)) < 10 or char_length(v_caption) > 2200 then
    raise exception 'Caption is not ready to save' using errcode = '22023';
  end if;
  if v_caption ~* 'auto[-[:space:]]?post'
    or v_caption ~* 'schedule this post'
    or v_caption ~* 'blotato'
    or v_caption ~* 'blacktwist'
  then
    raise exception 'Caption is not ready to save' using errcode = '22023';
  end if;

  select status, metadata
  into v_status, v_metadata
  from public.organization_content_drafts
  where id = p_draft_id
    and organization_id = p_organization_id
  for update;

  if v_status is null then
    raise exception 'Content draft is missing' using errcode = 'P0002';
  end if;

  if coalesce(v_metadata ->> 'brand_setup', '') = 'true' then
    raise exception 'Brand setup cannot be saved as a caption' using errcode = '22023';
  end if;

  if v_status = 'published' then
    v_status := 'ready_for_review';
  end if;

  update public.organization_content_drafts
  set
    caption = v_caption,
    status = v_status,
    metadata = coalesce(v_metadata, '{}'::jsonb) || jsonb_build_object(
      'owner_edited_at', to_jsonb(now()),
      'no_live_post', true,
      'no_scheduler', true
    )
  where id = p_draft_id
    and organization_id = p_organization_id;

  return v_caption;
end;
$$;

revoke execute on function public.update_micah_gallery_caption(uuid, uuid, text)
from public, anon;
grant execute on function public.update_micah_gallery_caption(uuid, uuid, text)
to authenticated;
grant execute on function public.update_micah_gallery_caption(uuid, uuid, text)
to service_role;
