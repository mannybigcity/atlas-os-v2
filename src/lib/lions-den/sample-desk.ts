import {
  AFE_CRM_DEMO_SLUG,
  FOUNDER_MAILBOX_EMAIL,
  SAMPLE_DESK_DISPLAY_NAME,
  SAMPLE_DESK_LOGIN_EMAIL,
  isAfeCrmDemoOrganization,
  isForbiddenSampleDeskLoginEmail,
  isSisOrganization,
  normalizeLoginEmail,
} from "../client-portal/identity.ts";

export const SAMPLE_DESK_KIND = "afe_crm_sample_desk";

export type SampleDeskCompany = {
  seedKey: string;
  name: string;
  daysUntilDue: number;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  contactSocial: string;
  nextAction: string;
  researchSummary: string;
  fitReason: string;
  noteTitle: string;
  noteBody: string;
  hunterPlaceId: string;
  noteReply: string;
};

export function getSampleDeskCompanies(): SampleDeskCompany[] {
  return [
    {
      seedKey: "abc-plumbing",
      name: "ABC Plumbing",
      daysUntilDue: 0,
      contactName: "Jordan Hale",
      contactPhone: "(555) 010-0101",
      contactEmail: "desk+abc-plumbing@example.invalid",
      contactSocial: "https://example.invalid/sample/abc-plumbing",
      nextAction: "Call Jordan Hale at ABC Plumbing today. Atlas has not contacted them.",
      researchSummary:
        "Sample record only. Fake plumbing shop asking about branded hats and a small crew paint-splatter party. Address is not real. Atlas must never email, call, or text this contact.",
      fitReason: "Sample fixture for the call list. Jordan Hale is not a live outreach target.",
      noteTitle: "ABC Plumbing",
      noteBody: [
        "Internal note — ABC Plumbing",
        "",
        "Contact: Jordan Hale",
        "Phone: (555) 010-0101 (fake, do not dial as live outreach)",
        "Email: desk+abc-plumbing@example.invalid",
        "",
        "They want a quote for 12 embroidered hats and a Saturday paint-splatter party for the shop crew. Confirm guest count and whether they want a door-hanger theme.",
        "",
        "Atlas has not called, emailed, or texted anyone. The salesman owns the next step.",
      ].join("\n"),
      hunterPlaceId: "sample-desk-accepted-abc-plumbing",
      noteReply:
        "Keep ABC Plumbing on today's call list. Atlas has not contacted Jordan Hale. Salesman owns the next step.",
    },
    {
      seedKey: "123-catering",
      name: "123 Catering",
      daysUntilDue: 1,
      contactName: "Riley Chen",
      contactPhone: "(555) 010-0102",
      contactEmail: "desk+123-catering@example.invalid",
      contactSocial: "https://example.invalid/sample/123-catering",
      nextAction: "Follow up with Riley Chen at 123 Catering tomorrow. Atlas has not contacted them.",
      researchSummary:
        "Sample record only. Fake catering kitchen interested in staff shirts and a paint-party for a client appreciation night. Not a real caterer. Atlas must never email, call, or text this contact.",
      fitReason: "Sample fixture so the Tomorrow queue has a dated next action.",
      noteTitle: "123 Catering",
      noteBody: [
        "Internal note — 123 Catering",
        "",
        "Contact: Riley Chen",
        "Phone: (555) 010-0102 (fake, do not dial as live outreach)",
        "Email: desk+123-catering@example.invalid",
        "",
        "They asked about 20 staff shirts and a door-hanger paint party after a tasting event. Confirm date, guest count, and whether they want a deposit invoice.",
        "",
        "Atlas has not called, emailed, or texted anyone. Follow up tomorrow.",
      ].join("\n"),
      hunterPlaceId: "sample-desk-accepted-123-catering",
      noteReply:
        "123 Catering sits in Tomorrow. Atlas has not contacted Riley Chen. Confirm guest count before any live call.",
    },
    {
      seedKey: "xyz-electric",
      name: "XYZ Electric",
      daysUntilDue: 7,
      contactName: "Morgan Blake",
      contactPhone: "(555) 010-0103",
      contactEmail: "desk+xyz-electric@example.invalid",
      contactSocial: "https://example.invalid/sample/xyz-electric",
      nextAction: "Later follow-up with Morgan Blake at XYZ Electric. Atlas has not contacted them.",
      researchSummary:
        "Sample record only. Fake electrical contractor looking at laser-engraved tool tags and a crew paint night. Not a real electrician. Atlas must never email, call, or text this contact.",
      fitReason: "Sample fixture for the Later queue and calendar.",
      noteTitle: "XYZ Electric",
      noteBody: [
        "Internal note — XYZ Electric",
        "",
        "Contact: Morgan Blake",
        "Phone: (555) 010-0103 (fake, do not dial as live outreach)",
        "Email: desk+xyz-electric@example.invalid",
        "",
        "They want engraved tool tags and a Friday crew paint night in two weeks. Confirm venue access and whether they can host 8 guests in the shop.",
        "",
        "Atlas has not called, emailed, or texted anyone. This is a later follow-up only.",
      ].join("\n"),
      hunterPlaceId: "sample-desk-accepted-xyz-electric",
      noteReply:
        "XYZ Electric is the Later follow-up. Atlas has not contacted Morgan Blake.",
    },
  ];
}

export function getSamplePendingHunterFind() {
  return {
    seedKey: "oak-street-vinyl",
    name: "Oak Street Vinyl",
    placeId: "sample-desk-oak-street-vinyl",
    formattedAddress: "404 Sample Oak St (not a real location). Do not visit or contact.",
    primaryType: "sample_lead",
    searchQuery: "Sample desk hunter review pile — no live search",
  };
}

export function getSampleDeskSeed() {
  const companies = getSampleDeskCompanies();
  return {
    prospects: companies,
    pendingHunter: getSamplePendingHunterFind(),
    notes: companies.map((company) => ({
      seedKey: company.seedKey,
      title: company.noteTitle,
      body: company.noteBody,
      reply: company.noteReply,
    })),
  };
}

export function assertSampleDeskSeedIsSafe(seed = getSampleDeskSeed()) {
  for (const prospect of seed.prospects) {
    if (/sis\s*custom\s*creations/i.test(prospect.name)) {
      throw new Error(`Sample desk record must not use the SIS company name: ${prospect.name}`);
    }
    if (!prospect.contactEmail.endsWith("@example.invalid")) {
      throw new Error(`Sample contact email must be clearly fake: ${prospect.contactEmail}`);
    }
    if (!prospect.contactPhone.includes("555")) {
      throw new Error(`Sample phone must be a fake 555 number: ${prospect.contactPhone}`);
    }
    if (prospect.noteBody.split("\n").length < 6) {
      throw new Error(`Sample note must be richer than a stub: ${prospect.noteTitle}`);
    }
  }
  if (seed.prospects.length !== 3) {
    throw new Error("Sample desk needs ABC Plumbing, 123 Catering, and XYZ Electric.");
  }
}

type SeedQueryClient = {
  from: (table: string) => any;
};

export function sampleDeskWriteTables() {
  return [
    "organizations",
    "organization_opportunities",
    "organization_opportunity_events",
    "organization_hunter_review_items",
    "organization_notes",
    "note_messages",
  ] as const;
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

export function seedSqlTouchesForbiddenLogin(sql: string) {
  const withoutComments = sql.replace(/--.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
  return (
    withoutComments.toLowerCase().includes(FOUNDER_MAILBOX_EMAIL) &&
    /insert\s+into\s+(public\.)?organization_memberships/i.test(withoutComments)
  );
}

export async function upsertSampleDeskRecords(client: SeedQueryClient) {
  assertSampleDeskSeedIsSafe();

  const organizationsResult = await client.from("organizations").select("id, name, slug");
  if (organizationsResult.error) {
    throw new Error(organizationsResult.error.message);
  }

  const organizations = (organizationsResult.data ?? []) as Array<{
    id: string;
    name: string | null;
    slug: string | null;
  }>;
  if (organizations.some((organization) => isSisOrganization(organization) && isAfeCrmDemoOrganization(organization))) {
    throw new Error("Sample desk cannot share an identity with SIS Custom Creations.");
  }

  let sample = organizations.find((organization) => isAfeCrmDemoOrganization(organization));
  if (!sample?.id) {
    const created = await client
      .from("organizations")
      .insert({ name: SAMPLE_DESK_DISPLAY_NAME, slug: AFE_CRM_DEMO_SLUG })
      .select("id, name, slug")
      .maybeSingle();
    if (created.error) {
      throw new Error(created.error.message);
    }
    sample = created.data as { id: string; name: string | null; slug: string | null } | undefined;
  } else if (sample.name !== SAMPLE_DESK_DISPLAY_NAME && !isSisOrganization(sample)) {
    const renamed = await client
      .from("organizations")
      .update({ name: SAMPLE_DESK_DISPLAY_NAME })
      .eq("id", sample.id);
    if (renamed.error) {
      throw new Error(renamed.error.message);
    }
    sample = { ...sample, name: SAMPLE_DESK_DISPLAY_NAME };
  }

  if (!sample?.id || isSisOrganization(sample)) {
    return { status: "skipped" as const, reason: "sample_organization_not_found" };
  }

  const seed = getSampleDeskSeed();
  const companies = getSampleDeskCompanies();
  const sampleMetadata = {
    sample_desk: true,
    demo: true,
    demo_kind: SAMPLE_DESK_KIND,
    no_outreach_sent: true,
    accepted_for_calling: true,
  };

  const opportunityRows = companies.map((prospect) => ({
    organization_id: sample.id,
    name: prospect.name,
    opportunity_type: "customer",
    stage: "ready_for_follow_up",
    fit_score: 78,
    owner_role: "client",
    source_label: "Sample desk seed — no outreach",
    source_url: `https://example.invalid/sample/${prospect.seedKey}`,
    contact_name: prospect.contactName,
    contact_email: prospect.contactEmail,
    contact_phone: prospect.contactPhone,
    contact_social: prospect.contactSocial,
    research_summary: prospect.researchSummary,
    fit_reason: prospect.fitReason,
    next_action: prospect.nextAction,
    next_action_due: isoDateFromToday(prospect.daysUntilDue),
    metadata: { ...sampleMetadata, seed_key: prospect.seedKey },
  }));

  const opportunityWrite = await client
    .from("organization_opportunities")
    .upsert(opportunityRows, { onConflict: "organization_id,name,opportunity_type" });
  if (opportunityWrite.error) {
    throw new Error(opportunityWrite.error.message);
  }

  const opportunities = await client
    .from("organization_opportunities")
    .select("id, name")
    .eq("organization_id", sample.id);
  if (opportunities.error) {
    throw new Error(opportunities.error.message);
  }
  const opportunityIdByName = new Map(
    ((opportunities.data ?? []) as Array<{ id: string; name: string }>).map((row) => [row.name, row.id]),
  );

  for (const company of companies) {
    const opportunityId = opportunityIdByName.get(company.name);
    if (!opportunityId) continue;
    const existingEvents = await client
      .from("organization_opportunity_events")
      .select("id")
      .eq("opportunity_id", opportunityId)
      .eq("event_type", "created");
    if (existingEvents.error) {
      throw new Error(existingEvents.error.message);
    }
    if (((existingEvents.data ?? []) as unknown[]).length === 0) {
      const { error } = await client.from("organization_opportunity_events").insert({
        opportunity_id: opportunityId,
        organization_id: sample.id,
        event_type: "created",
        actor_role: "hunter",
        summary: "Sample seed: accepted into Prospects. Atlas has not contacted anyone.",
        body: company.researchSummary,
      });
      if (error) throw new Error(error.message);
    }
    const nextActionEvents = await client
      .from("organization_opportunity_events")
      .select("id")
      .eq("opportunity_id", opportunityId)
      .eq("event_type", "next_action_set");
    if (nextActionEvents.error) {
      throw new Error(nextActionEvents.error.message);
    }
    if (((nextActionEvents.data ?? []) as unknown[]).length === 0) {
      const { error } = await client.from("organization_opportunity_events").insert({
        opportunity_id: opportunityId,
        organization_id: sample.id,
        event_type: "next_action_set",
        actor_role: "david",
        summary: company.nextAction,
        body: `Call ${company.contactName} at ${company.contactPhone}. Fake number. Atlas will not dial it.`,
      });
      if (error) throw new Error(error.message);
    }
  }

  const hunterRows = [
    {
      organization_id: sample.id,
      place_id: seed.pendingHunter.placeId,
      name: seed.pendingHunter.name,
      formatted_address: seed.pendingHunter.formattedAddress,
      google_maps_url: "https://example.invalid/maps/sample-oak-street-vinyl",
      website_url: "https://example.invalid/sample/oak-street-vinyl",
      primary_type: seed.pendingHunter.primaryType,
      business_status: "SAMPLE",
      search_query: seed.pendingHunter.searchQuery,
      status: "pending",
      accepted_opportunity_id: null,
    },
    ...companies.flatMap((company) => {
      const opportunityId = opportunityIdByName.get(company.name);
      if (!opportunityId) return [];
      return [
        {
          organization_id: sample.id,
          place_id: company.hunterPlaceId,
          name: company.name,
          formatted_address: `${company.name} sample address (not a real location)`,
          google_maps_url: `https://example.invalid/maps/sample-${company.seedKey}`,
          website_url: company.contactSocial,
          primary_type: "sample_lead",
          business_status: "SAMPLE",
          search_query: `Sample accepted find — ${company.name}`,
          status: "accepted",
          accepted_opportunity_id: opportunityId,
        },
      ];
    }),
  ];
  const hunterWrite = await client
    .from("organization_hunter_review_items")
    .upsert(hunterRows, { onConflict: "organization_id,place_id" });
  if (hunterWrite.error) {
    throw new Error(hunterWrite.error.message);
  }

  const existingNotes = await client
    .from("organization_notes")
    .select("id, title, organization_id, body")
    .eq("organization_id", sample.id);
  if (existingNotes.error) {
    throw new Error(existingNotes.error.message);
  }
  const noteRows = (existingNotes.data ?? []) as Array<{ id: string; title: string; body: string | null }>;
  const missingNotes = seed.notes.filter((note) => !noteRows.some((row) => row.title === note.title));
  if (missingNotes.length > 0) {
    const inserted = await client.from("organization_notes").insert(
      missingNotes.map((note) => ({
        organization_id: sample.id,
        title: note.title,
        body: note.body,
        attention_requested: false,
      })),
    );
    if (inserted.error) {
      throw new Error(inserted.error.message);
    }
  }

  const refreshedNotes = await client
    .from("organization_notes")
    .select("id, title, organization_id")
    .eq("organization_id", sample.id);
  if (refreshedNotes.error) {
    throw new Error(refreshedNotes.error.message);
  }
  for (const note of ((refreshedNotes.data ?? []) as Array<{ id: string; title: string }>)) {
    const seedNote = seed.notes.find((item) => item.title === note.title);
    if (!seedNote) continue;
    const messages = await client.from("note_messages").select("id, body").eq("note_id", note.id);
    if (messages.error) {
      throw new Error(messages.error.message);
    }
    const bodies = new Set(((messages.data ?? []) as Array<{ body?: string }>).map((row) => String(row.body ?? "")));
    if (!bodies.has(seedNote.body)) {
      const { error } = await client.from("note_messages").insert({
        organization_id: sample.id,
        note_id: note.id,
        author_kind: "client",
        author_display_name: "Sample seed",
        body: seedNote.body,
        attention_requested: false,
      });
      if (error) throw new Error(error.message);
    }
    if (!bodies.has(seedNote.reply)) {
      const { error } = await client.from("note_messages").insert({
        organization_id: sample.id,
        note_id: note.id,
        author_kind: "atlas_admin",
        author_display_name: "Ask Atlas",
        body: seedNote.reply,
        attention_requested: false,
      });
      if (error) throw new Error(error.message);
    }
  }

  return { status: "applied" as const, organizationId: sample.id };
}

export function assertEmailMayOwnSampleDesk(email?: string | null) {
  const value = normalizeLoginEmail(email);
  if (!value || isForbiddenSampleDeskLoginEmail(value)) {
    throw new Error("Sample desk login cannot use the founder mailbox.");
  }
  if (value !== SAMPLE_DESK_LOGIN_EMAIL && isForbiddenSampleDeskLoginEmail(value)) {
    throw new Error("Sample desk login email is not allowed.");
  }
}
