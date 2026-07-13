-- Atlas OS v2 - Security Advisor hardening
-- Fixes mutable function search paths and prevents trigger-only SECURITY
-- DEFINER functions from being called through the public RPC API.

alter function public.set_updated_at()
set search_path = '';

alter function public.is_atlas_super_admin()
set search_path = '';

-- This helper is used by authenticated RLS policies. Anonymous callers do not
-- need direct RPC access to it.
revoke execute on function public.is_atlas_super_admin() from public, anon;
grant execute on function public.is_atlas_super_admin() to authenticated;

-- These functions exist exclusively for database triggers. Revoking direct
-- execution does not disable their existing triggers.
revoke execute on function public.record_business_profile_activity()
from public, anon, authenticated;

revoke execute on function public.record_note_activity()
from public, anon, authenticated;

revoke execute on function public.record_note_message_activity()
from public, anon, authenticated;

revoke execute on function public.set_note_message_author()
from public, anon, authenticated;

revoke execute on function public.sync_note_attention_request()
from public, anon, authenticated;
