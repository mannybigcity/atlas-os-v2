import "server-only";

type SettingsClient = { from: (table: string) => any };

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
