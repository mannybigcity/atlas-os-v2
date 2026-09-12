import "server-only";

import { createClient } from "@/lib/supabase/server";

type SettingsClient = { from: (table: string) => any };

/** The owner's pay link or how-to-pay line for quotes; null until he sets one (or before the migration runs). */
export async function getDeskPayLink(organizationId: string): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("organization_desk_settings")
      .select("pay_link")
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (error) return null;
    const value = (data as { pay_link?: string | null } | null)?.pay_link;
    return typeof value === "string" && value.trim() ? value.trim() : null;
  } catch {
    return null;
  }
}

/**
 * True once the owner pressed "Clear samples". The trial seed must never
 * re-insert example records into that desk, even when it is empty.
 */
export async function ownerClearedTrialSamples(client: SettingsClient, organizationId: string) {
  try {
    const result = await client
      .from("organization_desk_settings")
      .select("samples_cleared_at")
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (result?.error) return false;
    const row = result?.data as { samples_cleared_at?: string | null } | null | undefined;
    return Boolean(row?.samples_cleared_at);
  } catch {
    return false;
  }
}
