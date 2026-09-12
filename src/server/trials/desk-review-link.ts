import "server-only";

type SettingsClient = { from: (table: string) => any };

/** The owner's saved Google review link, or "" when none is saved yet (or the column is missing). */
export async function getDeskReviewLink(client: SettingsClient, organizationId: string) {
  try {
    const result = await client
      .from("organization_desk_settings")
      .select("review_link")
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (result?.error) return "";
    const row = result?.data as { review_link?: string | null } | null | undefined;
    return String(row?.review_link ?? "").trim();
  } catch {
    return "";
  }
}
