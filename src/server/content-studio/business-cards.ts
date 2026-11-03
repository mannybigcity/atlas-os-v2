import { revalidatePath } from "next/cache";
import { isSisOrganization } from "@/lib/client-portal/identity";
import { inferTrialDeskMarket } from "@/lib/lions-den/trial-desk-market";
import { buildMicahCardsFromFacts } from "@/lib/lions-den/micah-business-cards";
import type { MicahBusinessFacts } from "@/lib/lions-den/micah-business-facts";
import {
  factsFromOwnerInput,
  resolveMicahBusinessFacts,
} from "@/lib/lions-den/micah-website";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hasServerIntegrationSecret } from "@/server/integrations/server-env";
import { generateStructuredText } from "@/server/integrations/openai-responses";
import { readMicahBrandKit, writeMicahBrandKit } from "./brand.ts";
import type { MicahBrandKit } from "@/lib/lions-den/micah-starter-week";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type MicahBusinessCardAction = {
  status: "success" | "intake" | "error";
  message: string;
  count: number;
};

const INTAKE_FALLBACK =
  "List what you sell, or add a website that names those services. Nothing was posted.";

function clip(value: string, max: number) {
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed.length <= max ? trimmed : trimmed.slice(0, max).trim();
}

async function pageFactsFromModel(pageText: string): Promise<Partial<MicahBusinessFacts> | null> {
  if (!hasServerIntegrationSecret("OPENAI_API_KEY")) return null;
  const result = await generateStructuredText({
    schemaName: "micah_business_page_facts",
    maxOutputTokens: 700,
    instructions: [
      "Read the business page text and copy only facts that appear in it.",
      "services: short names of services or products the page actually lists. Empty array if none are explicit.",
      "phone: a phone number printed on the page, or empty.",
      "city and state: only if the page states them, else empty.",
      "offer: a price or promotion sentence copied from the page, or empty.",
      "Do not invent services, prices, reviews, guarantees, or locations.",
    ].join(" "),
    input: pageText.slice(0, 12_000),
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        services: { type: "array", items: { type: "string" } },
        phone: { type: "string" },
        city: { type: "string" },
        state: { type: "string" },
        offer: { type: "string" },
      },
      required: ["services", "phone", "city", "state", "offer"],
    },
    parse(value) {
      const row = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
      const services = Array.isArray(row.services)
        ? row.services.filter((item): item is string => typeof item === "string")
        : [];
      return {
        services,
        phone: typeof row.phone === "string" ? row.phone : "",
        city: typeof row.city === "string" ? row.city : "",
        state: typeof row.state === "string" ? row.state : "",
        offer: typeof row.offer === "string" ? row.offer : "",
      } satisfies Partial<MicahBusinessFacts>;
    },
  });
  return result.value;
}

async function draftWriters() {
  const writers: Array<
    Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createAdminClient>
  > = [await createClient()];
  try {
    writers.push(createAdminClient());
  } catch {
    // Service-role is optional when the member session can write drafts.
  }
  return writers;
}

async function existingBusinessCardDate(organizationId: string) {
  for (const client of await draftWriters()) {
    try {
      const { data, error } = await client
        .from("organization_content_drafts")
        .select("draft_date, slot, metadata")
        .eq("organization_id", organizationId)
        .like("slot", "business-week-d%")
        .limit(7);
      if (error || !data?.length) continue;
      const dated = (data as Array<{ draft_date?: string; metadata?: { source?: string } }>).find(
        (row) => row.metadata?.source === "business_facts" && row.draft_date,
      );
      if (dated?.draft_date) return dated.draft_date;
    } catch {
      // Try the next reader.
    }
  }
  return new Date().toISOString().slice(0, 10);
}

export async function publishMicahBusinessCards(input: {
  organizationId: string;
  userId: string;
  facts: MicahBusinessFacts;
  primaryColor?: string | null;
  secondaryColor?: string | null;
}): Promise<MicahBusinessCardAction> {
  const cards = buildMicahCardsFromFacts(input.facts, {
    primaryColor: input.primaryColor,
    secondaryColor: input.secondaryColor,
  });
  if (!cards) {
    return { status: "intake", message: INTAKE_FALLBACK, count: 0 };
  }
  const draftDate = await existingBusinessCardDate(input.organizationId);
  const rows = cards.map((card) => ({
    organization_id: input.organizationId,
    draft_date: draftDate,
    slot: card.slot,
    campaign: "Business cards",
    title: card.title,
    headline: card.headline,
    supporting_text: card.supportingText,
    caption: card.caption,
    call_to_action: clip(card.callToAction, 240),
    platforms: ["facebook", "instagram", "linkedin"],
    visual_style: "atlas_branded",
    image_svg: card.imageSvg,
    status: "ready_for_review",
    generated_by: "micah",
    generation_source: "manual",
    metadata: {
      source: "business_facts",
      business_cards: true,
      trial_seed: false,
      week_pack: true,
      week_day: card.day,
      weekday: card.weekday,
      week_theme: card.theme,
      day_label: card.dayLabel,
      company_name: input.facts.businessName,
      website: input.facts.website,
      phone: input.facts.phone,
      services: input.facts.services,
      offer: input.facts.offer,
      instagram_caption: card.instagramCaption,
      linkedin_caption: card.linkedinCaption,
      kingdom_cta: card.callToAction,
      no_live_post: true,
      no_scheduler: true,
      no_atlas_logo: true,
      requested_by: input.userId,
    },
  }));
  const event = {
    organization_id: input.organizationId,
    event_type: "created",
    note: "MICAH business cards. Gallery drafts only. Atlas did not post these.",
    actor_user_id: input.userId,
    actor_label: "MICAH",
  };
  for (const client of await draftWriters()) {
    const { data, error } = await client
      .from("organization_content_drafts")
      .upsert(rows, { onConflict: "organization_id,draft_date,slot" })
      .select("id");
    if (error || !data?.length) continue;
    const ids = data.map((row) => String((row as { id: string }).id));
    await client.from("organization_content_draft_events").insert(
      ids.map((draftId) => ({ ...event, draft_id: draftId })),
    );
    revalidatePath("/client/micah");
    return {
      status: "success",
      count: ids.length,
      message: `MICAH saved ${ids.length} draft cards from your business details. Copy and download them yourself. Nothing was posted.`,
    };
  }
  return {
    status: "error",
    count: 0,
    message: "MICAH couldn't save the cards. Stay on this page and try again. Nothing was posted.",
  };
}

async function rememberFactsOnBrand(input: {
  organizationId: string;
  userId: string;
  kit: MicahBrandKit;
  facts: MicahBusinessFacts;
}) {
  await writeMicahBrandKit({
    organizationId: input.organizationId,
    userId: input.userId,
    kit: {
      ...input.kit,
      businessName: input.facts.businessName || input.kit.businessName,
      city: input.facts.city || input.kit.city,
      website: input.facts.website || input.kit.website,
      phone: input.facts.phone || input.kit.phone,
      services: input.facts.services.join("\n") || input.kit.services,
      weeklyOffer: input.facts.offer || input.kit.weeklyOffer,
      usesBusinessCards: true,
      setupSaved: true,
    },
  });
}

export async function buildMicahBusinessCards(input: {
  organizationId: string;
  userId: string;
  kit: MicahBrandKit;
  businessName: string;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  phone?: string | null;
  website?: string | null;
  services?: string | null;
  offer?: string | null;
  fetchImpl?: typeof fetch;
}): Promise<MicahBusinessCardAction> {
  const market = inferTrialDeskMarket({
    businessName: input.businessName || input.kit.businessName,
    city: input.city || input.kit.city,
    state: input.state,
    zipCode: input.zipCode,
  });
  const base = factsFromOwnerInput({
    businessName: market.businessName || input.businessName,
    city: market.city,
    state: market.state,
    zipCode: market.zipCode || input.zipCode,
    phone: input.phone || input.kit.phone,
    website: input.website || input.kit.website,
    services: input.services || input.kit.services,
    offer: input.offer ?? "",
  });
  const resolved = await resolveMicahBusinessFacts({
    base,
    fetchImpl: input.fetchImpl,
    completeFromPage: pageFactsFromModel,
  });
  if (resolved.status !== "ready") {
    return { status: "intake", message: resolved.message, count: 0 };
  }
  const published = await publishMicahBusinessCards({
    organizationId: input.organizationId,
    userId: input.userId,
    facts: resolved.facts,
    primaryColor: input.kit.primaryColor,
    secondaryColor: input.kit.secondaryColor,
  });
  if (published.status === "success") {
    await rememberFactsOnBrand({
      organizationId: input.organizationId,
      userId: input.userId,
      kit: input.kit,
      facts: resolved.facts,
    });
  }
  return published;
}

export async function buildMicahBusinessCardsFromForm(formData: FormData): Promise<MicahBusinessCardAction> {
  const organizationId = String(formData.get("organizationId") ?? "").trim();
  if (!uuidPattern.test(organizationId)) {
    return { status: "error", message: "Select a workspace before building cards. Nothing was posted.", count: 0 };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { status: "error", message: "Sign in to build these cards. Nothing was posted.", count: 0 };
  }
  const { data: organization } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("id", organizationId)
    .maybeSingle();
  if (!organization) {
    return { status: "error", message: "Select a workspace before building cards. Nothing was posted.", count: 0 };
  }
  if (isSisOrganization({ name: organization.name, slug: organization.slug })) {
    return { status: "error", message: "This desk cannot be edited on that workspace.", count: 0 };
  }
  const kit = await readMicahBrandKit(organizationId);
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  return buildMicahBusinessCards({
    organizationId,
    userId: user.id,
    kit,
    businessName: firstFilled(formData.get("businessName"), kit.businessName, organization.name),
    city: firstFilled(formData.get("city"), kit.city, metadata.city),
    state: firstFilled(metadata.state),
    zipCode: firstFilled(metadata.postal_code, metadata.postalCode, metadata.zip_code, metadata.zipCode),
    phone: firstFilled(formData.get("phone"), kit.phone, metadata.phone),
    website: firstFilled(formData.get("website"), kit.website, metadata.website, metadata.website_url),
    services: firstFilled(formData.get("services"), kit.services),
    offer: firstFilled(formData.get("offer")),
  });
}

function firstFilled(...values: unknown[]) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}
