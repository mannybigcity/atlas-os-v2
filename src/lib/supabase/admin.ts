import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv, getSupabaseServiceRoleKey } from "@/lib/env";

export function createAdminClient() {
  const { supabaseUrl } = getSupabaseEnv();

  return createSupabaseClient(supabaseUrl, getSupabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
