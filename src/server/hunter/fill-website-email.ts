import { normalizeWebsiteEmail } from "@/lib/lions-den/website-email";
import { createClient } from "@/lib/supabase/server";
import { findEmailOnBusinessWebsite } from "@/server/hunter/website-email";
import { asOpportunityMetadata } from "@/server/opportunities/queries";

/**
 * If the prospect has no inbox yet, read the stored website once and save
 * whatever public email is there. Does not invent an address. Skips a second
 * trip after HUNTER has already looked.
 */
export async function fillMissingOpportunityEmail(organizationId: string, opportunityId: string) {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("organization_opportunities")
    .select("id, contact_email, contact_social, metadata")
    .eq("id", opportunityId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!existing) return { email: null as string | null, foundNow: false };

  const stored = normalizeWebsiteEmail(existing.contact_email);
  if (stored) return { email: stored, foundNow: false };

  const metadata = asOpportunityMetadata(existing.metadata);
  if (metadata.hunter_website_email_at) {
    return { email: normalizeWebsiteEmail(String(metadata.hunter_website_email ?? "")), foundNow: false };
  }

  const website =
    (typeof metadata.website_url === "string" ? metadata.website_url : null) || existing.contact_social;
  const found = await findEmailOnBusinessWebsite(website);
  const { error } = await supabase
    .from("organization_opportunities")
    .update({
      contact_email: found,
      metadata: {
        ...metadata,
        hunter_website_email: found,
        hunter_website_email_at: new Date().toISOString(),
      },
    })
    .eq("id", opportunityId)
    .eq("organization_id", organizationId);
  if (error) return { email: null, foundNow: false };

  if (found) {
    await supabase.from("organization_opportunity_events").insert({
      opportunity_id: opportunityId,
      organization_id: organizationId,
      event_type: "note_added",
      actor_role: "hunter",
      summary: `HUNTER found ${found} on the business website. Atlas did not email them.`,
      body: website,
    });
  }

  return { email: found, foundNow: Boolean(found) };
}
