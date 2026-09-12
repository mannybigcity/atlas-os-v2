import "server-only";

import { createServiceClient } from "@/lib/supabase/service";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;

export type LeadPageOrganization = { id: string; name: string; slug: string };

/** Public lookup for the lead page: the org name is all a visitor ever sees. */
export async function getLeadPageOrganization(slug: string): Promise<LeadPageOrganization | null> {
  if (!SLUG_PATTERN.test(slug) || slug.length > 120) return null;
  const service = createServiceClient();
  const { data } = await service
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", slug)
    .maybeSingle();
  return data ? (data as LeadPageOrganization) : null;
}

/** Same fallback the notification emails use; never throws at render time. */
export function leadPageBaseUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://atlasforentrepreneurs.com").replace(/\/$/, "");
}
