import { isSisOrganization } from "../client-portal/identity.ts";
import { assertCanApplyOrganizationIdentityPatch } from "../client-portal/protected-organization.ts";

export const SIS_DEMO_DESK_KIND = "sis_lions_den_demo_desk";

type DemoProspect = {
  seedKey: string;
  name: string;
  daysUntilDue: number;
  nextAction: string;
  contactEmail: string;
  researchSummary: string;
  fitReason: string;
};

type DemoHunterFind = {
  seedKey: string;
  name: string;
  placeId: string;
  formattedAddress: string;
  primaryType: string;
  searchQuery: string;
};

type DemoNote = {
  seedKey: string;
  title: string;
  body: string;
};

type DemoMicahDraft = {
  seedKey: string;
  slot: string;
  title: string;
  headline: string;
  supportingText: string;
  caption: string;
  callToAction: string;
};

export type SisDemoDeskSeed = {
  prospects: DemoProspect[];
  pendingHunter: DemoHunterFind;
  notes: DemoNote[];
  micahDraft: DemoMicahDraft;
};

export function getSisDemoDeskSeed(): SisDemoDeskSeed {
  return {
    prospects: [
      {
        seedKey: "abc-plumbing",
        name: "ABC Plumbing (DEMO)",
        daysUntilDue: 0,
        nextAction: "DEMO: salesman can call ABC Plumbing. Atlas has not contacted them.",
        contactEmail: "demo+abc-plumbing@example.invalid",
        researchSummary:
          "DEMO record only. Fake plumbing lead inside the SIS Lion's Den so the salesman can practice the call list. Not a real business. Atlas must never email, call, or text this contact.",
        fitReason:
          "DEMO fixture for the SIS desk. Do not treat as live outreach. SIS Custom Creations remains the workspace owner, not this lead.",
      },
      {
        seedKey: "123-catering",
        name: "123 Catering (DEMO)",
        daysUntilDue: 1,
        nextAction: "DEMO: follow up with 123 Catering tomorrow. Atlas has not contacted them.",
        contactEmail: "demo+123-catering@example.invalid",
        researchSummary:
          "DEMO record only. Fake catering lead for SIS Custom Creations follow-up practice. Not a real caterer. Atlas must never email, call, or text this contact.",
        fitReason:
          "DEMO fixture so Today/Tomorrow queues have a dated next action. This is a contact of SIS, not a replacement company.",
      },
      {
        seedKey: "xyz-electric",
        name: "XYZ Electric (DEMO)",
        daysUntilDue: 7,
        nextAction: "DEMO: later follow-up with XYZ Electric. Atlas has not contacted them.",
        contactEmail: "demo+xyz-electric@example.invalid",
        researchSummary:
          "DEMO record only. Fake electrical contractor lead for the SIS Lion's Den calendar and later queue. Not a real electrician. Atlas must never email, call, or text this contact.",
        fitReason:
          "DEMO fixture for a later follow-up date. Leave SIS Custom Creations identity unchanged.",
      },
    ],
    pendingHunter: {
      seedKey: "oak-street-vinyl",
      name: "Oak Street Vinyl (DEMO)",
      placeId: "demo-sis-desk-oak-street-vinyl",
      formattedAddress: "DEMO address only — not a real location. Do not visit or contact.",
      primaryType: "demo_lead",
      searchQuery: "DEMO SIS desk hunter review pile — no live search",
    },
    notes: [
      {
        seedKey: "abc-plumbing",
        title: "DEMO: ABC Plumbing",
        body: "DEMO note for ABC Plumbing. Fake contact of SIS Custom Creations. Atlas has not called, emailed, or texted them.",
      },
      {
        seedKey: "123-catering",
        title: "DEMO: 123 Catering",
        body: "DEMO note for 123 Catering. Fake contact of SIS Custom Creations. Atlas has not called, emailed, or texted them.",
      },
      {
        seedKey: "xyz-electric",
        title: "DEMO: XYZ Electric",
        body: "DEMO note for XYZ Electric. Fake contact of SIS Custom Creations. Atlas has not called, emailed, or texted them.",
      },
    ],
    micahDraft: {
      seedKey: "abc-plumbing-draft",
      slot: "demo-desk-abc-plumbing",
      title: "DEMO caption for ABC Plumbing",
      headline: "DEMO — not for publishing",
      supportingText: "Sample caption only. Tied to ABC Plumbing (DEMO).",
      caption:
        "DEMO draft only for ABC Plumbing. Download and review if you want. Do not publish. Atlas did not post this anywhere. This is a fake contact of SIS Custom Creations, not a change to the SIS business.",
      callToAction: "DEMO: do not publish or send.",
    },
  };
}

export function sisDemoDeskWriteTables() {
  return [
    "organization_opportunities",
    "organization_opportunity_events",
    "organization_hunter_review_items",
    "organization_notes",
    "note_messages",
    "organization_content_drafts",
    "organization_content_draft_events",
  ] as const;
}

export function assertSisDemoSeedIsSafe(seed: SisDemoDeskSeed = getSisDemoDeskSeed()) {
  const records = [
    ...seed.prospects.map((item) => item.name),
    seed.pendingHunter.name,
    ...seed.notes.map((item) => item.title),
    seed.micahDraft.title,
  ];

  for (const label of records) {
    if (!/DEMO/i.test(label)) {
      throw new Error(`Demo desk record must be labeled DEMO: ${label}`);
    }
    if (/sis\s*custom\s*creations/i.test(label)) {
      throw new Error(`Demo desk record must not use the SIS company name: ${label}`);
    }
  }

  for (const prospect of seed.prospects) {
    if (!prospect.contactEmail.endsWith("@example.invalid")) {
      throw new Error(`Demo contact email must be clearly fake: ${prospect.contactEmail}`);
    }
    if (/plumber|caterer|electrician/i.test(prospect.name) && /sis/i.test(prospect.name)) {
      throw new Error("SIS must not be renamed into a demo trade.");
    }
  }
}

type SeedQueryClient = {
  from: (table: string) => any;
};

export async function upsertSisDemoDeskRecords(client: SeedQueryClient) {
  assertSisDemoSeedIsSafe();

  const organizationsResult = await client.from("organizations").select("id, name, slug");
  if (organizationsResult.error) {
    throw new Error(organizationsResult.error.message);
  }

  const organizations = (organizationsResult.data ?? []) as Array<{
    id: string;
    name: string | null;
    slug: string | null;
  }>;
  const sis = organizations.find((organization) => isSisOrganization(organization));
  if (!sis?.id) {
    return { status: "skipped" as const, reason: "sis_organization_not_found" };
  }

  assertCanApplyOrganizationIdentityPatch(sis, {});

  const seed = getSisDemoDeskSeed();
  const demoMetadata = {
    demo: true,
    demo_kind: SIS_DEMO_DESK_KIND,
    no_outreach_sent: true,
    accepted_for_calling: true,
  };

  const opportunityRows = seed.prospects.map((prospect) => ({
    organization_id: sis.id,
    name: prospect.name,
    opportunity_type: "customer",
    stage: "ready_for_follow_up",
    fit_score: 40,
    owner_role: "client",
    source_label: "DEMO seed — no outreach",
    source_url: `https://example.invalid/demo/${prospect.seedKey}`,
    contact_name: "DEMO contact",
    contact_email: prospect.contactEmail,
    contact_phone: null,
    research_summary: prospect.researchSummary,
    fit_reason: prospect.fitReason,
    next_action: prospect.nextAction,
    next_action_due: isoDateFromToday(prospect.daysUntilDue),
    metadata: { ...demoMetadata, seed_key: prospect.seedKey },
  }));

  const opportunityWrite = await client
    .from("organization_opportunities")
    .upsert(opportunityRows, { onConflict: "organization_id,name,opportunity_type" });
  if (opportunityWrite.error) {
    throw new Error(opportunityWrite.error.message);
  }

  const hunterWrite = await client.from("organization_hunter_review_items").upsert(
    {
      organization_id: sis.id,
      place_id: seed.pendingHunter.placeId,
      name: seed.pendingHunter.name,
      formatted_address: seed.pendingHunter.formattedAddress,
      google_maps_url: "https://example.invalid/maps/demo-oak-street-vinyl",
      website_url: "https://example.invalid/demo/oak-street-vinyl",
      primary_type: seed.pendingHunter.primaryType,
      business_status: "DEMO",
      search_query: seed.pendingHunter.searchQuery,
      status: "pending",
    },
    { onConflict: "organization_id,place_id" },
  );
  if (hunterWrite.error) {
    throw new Error(hunterWrite.error.message);
  }

  const existingNotes = await client
    .from("organization_notes")
    .select("id, title, organization_id")
    .eq("organization_id", sis.id);
  const noteRows = (existingNotes.data ?? []) as Array<{ title: string }>;
  const missingNotes = seed.notes.filter(
    (note) => !noteRows.some((row) => row.title === note.title),
  );
  if (missingNotes.length > 0) {
    const inserted = await client.from("organization_notes").insert(
      missingNotes.map((note) => ({
        organization_id: sis.id,
        title: note.title,
        body: note.body,
        attention_requested: false,
      })),
    );
    if (inserted.error) {
      throw new Error(inserted.error.message);
    }
  }

  const draftWrite = await client.from("organization_content_drafts").upsert(
    {
      organization_id: sis.id,
      draft_date: isoDateFromToday(0),
      slot: seed.micahDraft.slot,
      campaign: "DEMO desk sample",
      title: seed.micahDraft.title,
      headline: seed.micahDraft.headline,
      supporting_text: seed.micahDraft.supportingText,
      caption: seed.micahDraft.caption,
      call_to_action: seed.micahDraft.callToAction,
      platforms: ["instagram"],
      visual_style: "atlas_branded",
      status: "ready_for_review",
      generated_by: "micah",
      generation_source: "manual",
      metadata: { ...demoMetadata, tied_to: "ABC Plumbing (DEMO)", published: false },
    },
    { onConflict: "organization_id,draft_date,slot" },
  );
  if (draftWrite.error) {
    throw new Error(draftWrite.error.message);
  }

  return { status: "applied" as const, organizationId: sis.id };
}

function isoDateFromToday(daysUntilDue: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + daysUntilDue);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function seedSqlMutatesSisOrganizationIdentity(sql: string) {
  const withoutComments = sql.replace(/--.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
  return /^\s*update\s+(public\.)?organizations\b/im.test(withoutComments);
}
