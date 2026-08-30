import { isSisOrganization } from "../client-portal/identity.ts";
import { assertCanApplyOrganizationIdentityPatch } from "../client-portal/protected-organization.ts";

export const SIS_DEMO_DESK_KIND = "sis_lions_den_demo_desk";

export type SisDemoCompany = {
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
  quoteNumber: string;
  orderNumber: string;
  leadRequestId: string;
  offer: string;
  partyType: string;
  guestCount: number;
  address: string;
  city: string;
  venueType: string;
  theme: string;
  totalDue: number;
  amountPaid: number;
  depositStatus: "unpaid" | "pending" | "paid";
  calendarStatus: "not_scheduled" | "tentative" | "confirmed";
  partyStage: "qualified" | "quote_sent" | "booked";
  customerConfirmation: "not_sent" | "pending" | "confirmed";
  noteReply: string;
  draftSlot: string;
  draftTitle: string;
  draftHeadline: string;
  draftSupporting: string;
  draftCaption: string;
};

export function getSisDemoCompanies(): SisDemoCompany[] {
  return [
    {
      seedKey: "abc-plumbing",
      name: "ABC Plumbing (DEMO)",
      daysUntilDue: 0,
      contactName: "Jordan Hale (DEMO)",
      contactPhone: "(555) 010-0101",
      contactEmail: "demo+abc-plumbing@example.invalid",
      contactSocial: "https://example.invalid/demo/abc-plumbing",
      nextAction: "DEMO: salesman can call Jordan Hale at ABC Plumbing today. Atlas has not contacted them.",
      researchSummary:
        "DEMO record only. Fake plumbing shop that asked SIS Custom Creations about branded hats and a small paint-splatter party for the crew. Address is not real. Atlas must never email, call, or text this contact.",
      fitReason:
        "DEMO fixture for the SIS call list. Jordan Hale is a fake contact of SIS, not a replacement for the SIS company.",
      noteTitle: "DEMO: ABC Plumbing",
      noteBody: [
        "DEMO internal note — ABC Plumbing",
        "",
        "Contact: Jordan Hale (DEMO)",
        "Phone: (555) 010-0101 (fake, do not dial as live outreach)",
        "Email: demo+abc-plumbing@example.invalid",
        "",
        "They want a quote for 12 embroidered hats and a Saturday paint-splatter party for the shop crew. Confirm guest count and whether they want a door-hanger theme.",
        "",
        "Atlas has not called, emailed, or texted anyone. The salesman owns the next step. This is a practice contact inside the SIS Lion's Den, not a change to SIS Custom Creations.",
      ].join("\n"),
      hunterPlaceId: "demo-sis-desk-accepted-abc-plumbing",
      quoteNumber: "DEMO-Q-ABC",
      orderNumber: "DEMO-O-ABC",
      leadRequestId: "demo-desk-abc-plumbing",
      offer: "DEMO: hats + crew paint-splatter party",
      partyType: "Adult door-hanger paint party",
      guestCount: 12,
      address: "101 Demo Main St (not a real address)",
      city: "Demo City",
      venueType: "Shop bay",
      theme: "Navy hats, gold splatter",
      totalDue: 480,
      amountPaid: 0,
      depositStatus: "unpaid",
      calendarStatus: "tentative",
      partyStage: "qualified",
      customerConfirmation: "not_sent",
      noteReply:
        "DEMO staff reply: keep ABC Plumbing on today's call list. Atlas has not contacted Jordan Hale. Salesman owns the next step.",
      draftSlot: "demo-desk-abc-plumbing",
      draftTitle: "DEMO caption for ABC Plumbing",
      draftHeadline: "DEMO — hats for the crew",
      draftSupporting: "Sample caption only. Tied to ABC Plumbing (DEMO).",
      draftCaption:
        "DEMO draft only for ABC Plumbing. Download and review if you want. Do not publish. Atlas did not post this. Fake contact of SIS Custom Creations, not a change to the SIS business.",
    },
    {
      seedKey: "123-catering",
      name: "123 Catering (DEMO)",
      daysUntilDue: 1,
      contactName: "Riley Chen (DEMO)",
      contactPhone: "(555) 010-0102",
      contactEmail: "demo+123-catering@example.invalid",
      contactSocial: "https://example.invalid/demo/123-catering",
      nextAction: "DEMO: follow up with Riley Chen at 123 Catering tomorrow. Atlas has not contacted them.",
      researchSummary:
        "DEMO record only. Fake catering kitchen interested in staff shirts and a paint-party for a client appreciation night. Not a real caterer. Atlas must never email, call, or text this contact.",
      fitReason:
        "DEMO fixture so the Tomorrow queue has a dated next action. This is a contact of SIS, not a replacement company.",
      noteTitle: "DEMO: 123 Catering",
      noteBody: [
        "DEMO internal note — 123 Catering",
        "",
        "Contact: Riley Chen (DEMO)",
        "Phone: (555) 010-0102 (fake, do not dial as live outreach)",
        "Email: demo+123-catering@example.invalid",
        "",
        "They asked about 20 staff shirts and a door-hanger paint party after a tasting event. Confirm date, guest count, and whether they want a deposit invoice.",
        "",
        "Atlas has not called, emailed, or texted anyone. Follow up tomorrow. This is a practice contact inside the SIS Lion's Den.",
      ].join("\n"),
      hunterPlaceId: "demo-sis-desk-accepted-123-catering",
      quoteNumber: "DEMO-Q-123",
      orderNumber: "DEMO-O-123",
      leadRequestId: "demo-desk-123-catering",
      offer: "DEMO: staff shirts + appreciation paint party",
      partyType: "Client appreciation paint party",
      guestCount: 20,
      address: "202 Demo Market Ave (not a real address)",
      city: "Demo City",
      venueType: "Kitchen loft",
      theme: "Citrus splash, black shirts",
      totalDue: 720,
      amountPaid: 180,
      depositStatus: "pending",
      calendarStatus: "tentative",
      partyStage: "quote_sent",
      customerConfirmation: "pending",
      noteReply:
        "DEMO staff reply: 123 Catering sits in Tomorrow. Atlas has not contacted Riley Chen. Confirm guest count before any live call.",
      draftSlot: "demo-desk-123-catering",
      draftTitle: "DEMO caption for 123 Catering",
      draftHeadline: "DEMO — tasting night shirts",
      draftSupporting: "Sample caption only. Tied to 123 Catering (DEMO).",
      draftCaption:
        "DEMO draft only for 123 Catering. Download and review if you want. Do not publish. Atlas did not post this. Fake contact of SIS Custom Creations.",
    },
    {
      seedKey: "xyz-electric",
      name: "XYZ Electric (DEMO)",
      daysUntilDue: 7,
      contactName: "Morgan Blake (DEMO)",
      contactPhone: "(555) 010-0103",
      contactEmail: "demo+xyz-electric@example.invalid",
      contactSocial: "https://example.invalid/demo/xyz-electric",
      nextAction: "DEMO: later follow-up with Morgan Blake at XYZ Electric. Atlas has not contacted them.",
      researchSummary:
        "DEMO record only. Fake electrical contractor looking at laser-engraved tool tags and a crew paint night. Not a real electrician. Atlas must never email, call, or text this contact.",
      fitReason:
        "DEMO fixture for the Later queue and calendar. Leave SIS Custom Creations identity unchanged.",
      noteTitle: "DEMO: XYZ Electric",
      noteBody: [
        "DEMO internal note — XYZ Electric",
        "",
        "Contact: Morgan Blake (DEMO)",
        "Phone: (555) 010-0103 (fake, do not dial as live outreach)",
        "Email: demo+xyz-electric@example.invalid",
        "",
        "They want engraved tool tags and a Friday crew paint night in two weeks. Confirm venue access and whether they can host 8 guests in the shop.",
        "",
        "Atlas has not called, emailed, or texted anyone. This is a later follow-up only. Practice contact of SIS, not a live outreach target.",
      ].join("\n"),
      hunterPlaceId: "demo-sis-desk-accepted-xyz-electric",
      quoteNumber: "DEMO-Q-XYZ",
      orderNumber: "DEMO-O-XYZ",
      leadRequestId: "demo-desk-xyz-electric",
      offer: "DEMO: engraved tags + crew paint night",
      partyType: "Crew paint night",
      guestCount: 8,
      address: "303 Demo Utility Rd (not a real address)",
      city: "Demo City",
      venueType: "Warehouse corner",
      theme: "Safety yellow on navy",
      totalDue: 360,
      amountPaid: 360,
      depositStatus: "paid",
      calendarStatus: "confirmed",
      partyStage: "booked",
      customerConfirmation: "confirmed",
      noteReply:
        "DEMO staff reply: XYZ Electric is the Later follow-up. Atlas has not contacted Morgan Blake. Leave SIS Custom Creations identity unchanged.",
      draftSlot: "demo-desk-xyz-electric",
      draftTitle: "DEMO caption for XYZ Electric",
      draftHeadline: "DEMO — crew night",
      draftSupporting: "Sample caption only. Tied to XYZ Electric (DEMO).",
      draftCaption:
        "DEMO draft only for XYZ Electric. Download and review if you want. Do not publish. Atlas did not post this. Fake contact of SIS Custom Creations.",
    },
  ];
}

export function getSisPendingHunterFind() {
  return {
    seedKey: "oak-street-vinyl",
    name: "Oak Street Vinyl (DEMO)",
    placeId: "demo-sis-desk-oak-street-vinyl",
    formattedAddress: "404 Demo Oak St (not a real location). Do not visit or contact.",
    primaryType: "demo_lead",
    searchQuery: "DEMO SIS desk hunter review pile — no live search",
  };
}

export function getSisDemoDeskSeed() {
  return {
    prospects: getSisDemoCompanies(),
    pendingHunter: getSisPendingHunterFind(),
    notes: getSisDemoCompanies().map((company) => ({
      seedKey: company.seedKey,
      title: company.noteTitle,
      body: company.noteBody,
      reply: company.noteReply,
    })),
    micahDrafts: getSisDemoCompanies().map((company) => ({
      seedKey: `${company.seedKey}-draft`,
      slot: company.draftSlot,
      title: company.draftTitle,
      headline: company.draftHeadline,
      supportingText: company.draftSupporting,
      caption: company.draftCaption,
      callToAction: "DEMO: do not publish or send.",
      imageSvg: demoMicahSvg(company),
    })),
  };
}

export function demoMicahSvg(company: Pick<SisDemoCompany, "name" | "draftHeadline">) {
  const headline = escapeXml(company.draftHeadline);
  const name = escapeXml(company.name);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080"><rect width="1080" height="1080" fill="#071b42"/><text x="80" y="180" fill="#f5b932" font-size="34" font-family="Arial,sans-serif">DEMO DRAFT</text><text x="80" y="360" fill="#ffffff" font-size="58" font-family="Arial,sans-serif">${headline}</text><text x="80" y="460" fill="#d8c27a" font-size="32" font-family="Arial,sans-serif">${name}</text><text x="80" y="980" fill="#fff8e6" font-size="26" font-family="Arial,sans-serif">Not for publishing. Atlas did not post this.</text></svg>`;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
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
    "organization_sis_customers",
    "organization_sis_leads",
    "organization_sis_quotes",
    "organization_sis_quote_items",
    "organization_sis_orders",
    "organization_sis_order_items",
    "organization_sis_fulfillment_jobs",
    "organization_sis_party_events",
    "organization_sis_party_tasks",
    "organization_sis_activity_events",
  ] as const;
}

export function assertSisDemoSeedIsSafe(seed = getSisDemoDeskSeed()) {
  const records = [
    ...seed.prospects.map((item) => item.name),
    seed.pendingHunter.name,
    ...seed.notes.map((item) => item.title),
    ...seed.micahDrafts.map((item) => item.title),
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
    if (!prospect.contactPhone.includes("555")) {
      throw new Error(`Demo phone must be a fake 555 number: ${prospect.contactPhone}`);
    }
    if (!/DEMO/i.test(prospect.contactName)) {
      throw new Error(`Demo contact name must be labeled DEMO: ${prospect.contactName}`);
    }
    if (prospect.noteBody.split("\n").length < 6) {
      throw new Error(`Demo note must be richer than a stub: ${prospect.noteTitle}`);
    }
  }

  if (seed.micahDrafts.length !== 3) {
    throw new Error("MICAH needs one downloadable draft per DEMO company.");
  }
  for (const draft of seed.micahDrafts) {
    if (!draft.imageSvg.includes("DEMO DRAFT")) {
      throw new Error(`MICAH draft must include a downloadable DEMO image: ${draft.title}`);
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
  const companies = getSisDemoCompanies();
  const demoMetadata = {
    demo: true,
    demo_kind: SIS_DEMO_DESK_KIND,
    no_outreach_sent: true,
    accepted_for_calling: true,
  };

  const opportunityRows = companies.map((prospect) => ({
    organization_id: sis.id,
    name: prospect.name,
    opportunity_type: "customer",
    stage: "ready_for_follow_up",
    fit_score: 78,
    owner_role: "client",
    source_label: "DEMO seed — no outreach",
    source_url: `https://example.invalid/demo/${prospect.seedKey}`,
    contact_name: prospect.contactName,
    contact_email: prospect.contactEmail,
    contact_phone: prospect.contactPhone,
    contact_social: prospect.contactSocial,
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

  const opportunities = await client
    .from("organization_opportunities")
    .select("id, name")
    .eq("organization_id", sis.id);
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
        organization_id: sis.id,
        event_type: "created",
        actor_role: "hunter",
        summary: "DEMO seed: accepted into Prospects. Atlas has not contacted anyone.",
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
        organization_id: sis.id,
        event_type: "next_action_set",
        actor_role: "david",
        summary: company.nextAction,
        body: `Call ${company.contactName} at ${company.contactPhone}. Fake DEMO number. Atlas will not dial it.`,
      });
      if (error) throw new Error(error.message);
    }
  }

  const hunterRows = [
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
      accepted_opportunity_id: null,
    },
    ...companies.flatMap((company) => {
      const opportunityId = opportunityIdByName.get(company.name);
      if (!opportunityId) return [];
      return [
        {
          organization_id: sis.id,
          place_id: company.hunterPlaceId,
          name: company.name,
          formatted_address: `${company.address}, ${company.city}`,
          google_maps_url: `https://example.invalid/maps/demo-${company.seedKey}`,
          website_url: company.contactSocial,
          primary_type: "demo_lead",
          business_status: "DEMO",
          search_query: `DEMO accepted SIS desk find — ${company.name}`,
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
    .eq("organization_id", sis.id);
  if (existingNotes.error) {
    throw new Error(existingNotes.error.message);
  }
  const noteRows = (existingNotes.data ?? []) as Array<{ id: string; title: string; body: string | null }>;
  const missingNotes = seed.notes.filter((note) => !noteRows.some((row) => row.title === note.title));
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
  for (const note of seed.notes) {
    const existing = noteRows.find((row) => row.title === note.title);
    if (existing && existing.body !== note.body) {
      const updated = await client.from("organization_notes").update({ body: note.body }).eq("id", existing.id);
      if (updated.error) throw new Error(updated.error.message);
    }
  }

  const refreshedNotes = await client
    .from("organization_notes")
    .select("id, title, organization_id")
    .eq("organization_id", sis.id);
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
        organization_id: sis.id,
        note_id: note.id,
        author_kind: "client",
        author_display_name: "DEMO seed",
        body: seedNote.body,
        attention_requested: false,
      });
      if (error) throw new Error(error.message);
    }
    if (!bodies.has(seedNote.reply)) {
      const { error } = await client.from("note_messages").insert({
        organization_id: sis.id,
        note_id: note.id,
        author_kind: "atlas_admin",
        author_display_name: "Ask Atlas (DEMO)",
        body: seedNote.reply,
        attention_requested: false,
      });
      if (error) throw new Error(error.message);
    }
  }

  const draftWrite = await client.from("organization_content_drafts").upsert(
    seed.micahDrafts.map((draft) => ({
      organization_id: sis.id,
      draft_date: "2026-08-29",
      slot: draft.slot,
      campaign: "DEMO desk sample",
      title: draft.title,
      headline: draft.headline,
      supporting_text: draft.supportingText,
      caption: draft.caption,
      call_to_action: draft.callToAction,
      platforms: ["instagram"],
      visual_style: "atlas_branded",
      image_svg: draft.imageSvg,
      status: "ready_for_review",
      generated_by: "micah",
      generation_source: "manual",
      metadata: { ...demoMetadata, published: false, seed_key: draft.seedKey },
    })),
    { onConflict: "organization_id,draft_date,slot" },
  );
  if (draftWrite.error) {
    throw new Error(draftWrite.error.message);
  }

  const drafts = await client
    .from("organization_content_drafts")
    .select("id, slot")
    .eq("organization_id", sis.id);
  if (drafts.error) {
    throw new Error(drafts.error.message);
  }
  for (const draft of ((drafts.data ?? []) as Array<{ id: string; slot: string }>)) {
    if (!seed.micahDrafts.some((item) => item.slot === draft.slot)) continue;
    const events = await client
      .from("organization_content_draft_events")
      .select("id")
      .eq("draft_id", draft.id)
      .eq("event_type", "created");
    if (events.error) {
      throw new Error(events.error.message);
    }
    if (((events.data ?? []) as unknown[]).length === 0) {
      const seedDraft = seed.micahDrafts.find((item) => item.slot === draft.slot);
      const { error } = await client.from("organization_content_draft_events").insert({
        draft_id: draft.id,
        organization_id: sis.id,
        event_type: "created",
        note: `DEMO MICAH draft for ${seedDraft?.title ?? draft.slot}. Downloadable caption only. Not published.`,
        actor_label: "DEMO seed",
      });
      if (error) throw new Error(error.message);
    }
  }

  const memberships = await client
    .from("organization_memberships")
    .select("user_id")
    .eq("organization_id", sis.id);
  if (memberships.error) {
    throw new Error(memberships.error.message);
  }
  const ownerUserId = ((memberships.data ?? []) as Array<{ user_id: string }>)[0]?.user_id ?? null;

  const existingCustomers = await client
    .from("organization_sis_customers")
    .select("id, email")
    .eq("organization_id", sis.id);
  if (existingCustomers.error) {
    throw new Error(existingCustomers.error.message);
  }
  const customerIdByEmail = new Map(
    ((existingCustomers.data ?? []) as Array<{ id: string; email: string | null }>)
      .filter((row) => row.email)
      .map((row) => [String(row.email), row.id]),
  );

  for (const company of companies) {
    const payload = {
      organization_id: sis.id,
      display_name: company.contactName,
      business_name: company.name,
      email: company.contactEmail,
      phone: company.contactPhone,
      notes: company.researchSummary,
      source_label: "DEMO seed",
      metadata: { ...demoMetadata, seed_key: company.seedKey },
      created_by: ownerUserId,
    };
    const existingId = customerIdByEmail.get(company.contactEmail);
    if (existingId) {
      const { error } = await client.from("organization_sis_customers").update(payload).eq("id", existingId);
      if (error) throw new Error(error.message);
    } else {
      const inserted = await client.from("organization_sis_customers").insert(payload).select("id").maybeSingle();
      if (inserted.error) throw new Error(inserted.error.message);
      const id = (inserted.data as { id?: string } | null)?.id;
      if (id) customerIdByEmail.set(company.contactEmail, id);
    }
  }

  const existingLeads = await client
    .from("organization_sis_leads")
    .select("id, source_request_id")
    .eq("organization_id", sis.id);
  if (existingLeads.error) {
    throw new Error(existingLeads.error.message);
  }
  const leadIdByRequest = new Map(
    ((existingLeads.data ?? []) as Array<{ id: string; source_request_id: string | null }>)
      .filter((row) => row.source_request_id)
      .map((row) => [String(row.source_request_id), row.id]),
  );

  for (const company of companies) {
    const payload = {
      organization_id: sis.id,
      customer_id: customerIdByEmail.get(company.contactEmail) ?? null,
      status: "new",
      offer: company.offer,
      source_label: "DEMO desk seed",
      details: company.researchSummary,
      due_date: isoDateFromToday(company.daysUntilDue),
      next_action: company.nextAction,
      next_action_due: isoDateFromToday(company.daysUntilDue),
      owner_user_id: ownerUserId,
      source_request_id: company.leadRequestId,
      raw_payload: {
        ...demoMetadata,
        seed_key: company.seedKey,
        contact_name: company.contactName,
        contact_phone: company.contactPhone,
        contact_email: company.contactEmail,
      },
      created_by: ownerUserId,
    };
    const existingId = leadIdByRequest.get(company.leadRequestId);
    if (existingId) {
      const { error } = await client.from("organization_sis_leads").update(payload).eq("id", existingId);
      if (error) throw new Error(error.message);
    } else {
      const inserted = await client.from("organization_sis_leads").insert(payload).select("id").maybeSingle();
      if (inserted.error) throw new Error(inserted.error.message);
      const id = (inserted.data as { id?: string } | null)?.id;
      if (id) leadIdByRequest.set(company.leadRequestId, id);
    }
  }

  const quoteWrite = await client.from("organization_sis_quotes").upsert(
    companies.map((company) => ({
      organization_id: sis.id,
      customer_id: customerIdByEmail.get(company.contactEmail),
      lead_id: leadIdByRequest.get(company.leadRequestId) ?? null,
      quote_number: company.quoteNumber,
      status: "sent",
      currency: "USD",
      subtotal: company.totalDue,
      tax: 0,
      total: company.totalDue,
      notes: company.researchSummary,
      created_by: ownerUserId,
    })),
    { onConflict: "organization_id,quote_number" },
  );
  if (quoteWrite.error) {
    throw new Error(quoteWrite.error.message);
  }

  const quotes = await client
    .from("organization_sis_quotes")
    .select("id, quote_number")
    .eq("organization_id", sis.id);
  if (quotes.error) {
    throw new Error(quotes.error.message);
  }
  const quoteIdByNumber = new Map(
    ((quotes.data ?? []) as Array<{ id: string; quote_number: string }>).map((row) => [row.quote_number, row.id]),
  );

  for (const company of companies) {
    const quoteId = quoteIdByNumber.get(company.quoteNumber);
    if (!quoteId) continue;
    const existingItems = await client
      .from("organization_sis_quote_items")
      .select("id")
      .eq("quote_id", quoteId);
    if (existingItems.error) {
      throw new Error(existingItems.error.message);
    }
    if (((existingItems.data ?? []) as unknown[]).length === 0) {
      const { error } = await client.from("organization_sis_quote_items").insert({
        organization_id: sis.id,
        quote_id: quoteId,
        description: `${company.offer} (DEMO)`,
        quantity: 1,
        unit_price: company.totalDue,
        line_total: company.totalDue,
        metadata: { ...demoMetadata, seed_key: company.seedKey },
      });
      if (error) throw new Error(error.message);
    }
  }

  const orderWrite = await client.from("organization_sis_orders").upsert(
    companies.map((company) => {
      const paid = company.depositStatus === "paid";
      return {
        organization_id: sis.id,
        customer_id: customerIdByEmail.get(company.contactEmail),
        quote_id: quoteIdByNumber.get(company.quoteNumber) ?? null,
        order_number: company.orderNumber,
        status: paid ? "paid" : company.depositStatus === "pending" ? "awaiting_payment" : "draft",
        payment_status: paid ? "paid" : company.depositStatus,
        currency: "USD",
        subtotal: company.totalDue,
        tax: 0,
        total: company.totalDue,
        due_date: isoDateFromToday(company.daysUntilDue),
        artwork_approved_at: paid ? "2026-08-28T18:00:00Z" : null,
        paid_at: paid ? "2026-08-28T18:00:00Z" : null,
        notes: company.researchSummary,
        created_by: ownerUserId,
      };
    }),
    { onConflict: "organization_id,order_number" },
  );
  if (orderWrite.error) {
    throw new Error(orderWrite.error.message);
  }

  const orders = await client
    .from("organization_sis_orders")
    .select("id, order_number")
    .eq("organization_id", sis.id);
  if (orders.error) {
    throw new Error(orders.error.message);
  }
  const orderIdByNumber = new Map(
    ((orders.data ?? []) as Array<{ id: string; order_number: string }>).map((row) => [row.order_number, row.id]),
  );

  for (const company of companies) {
    const orderId = orderIdByNumber.get(company.orderNumber);
    if (!orderId) continue;
    const existingItems = await client
      .from("organization_sis_order_items")
      .select("id")
      .eq("order_id", orderId);
    if (existingItems.error) {
      throw new Error(existingItems.error.message);
    }
    if (((existingItems.data ?? []) as unknown[]).length === 0) {
      const { error } = await client.from("organization_sis_order_items").insert({
        organization_id: sis.id,
        order_id: orderId,
        description: `${company.offer} (DEMO)`,
        quantity: 1,
        unit_price: company.totalDue,
        line_total: company.totalDue,
        metadata: { ...demoMetadata, seed_key: company.seedKey },
      });
      if (error) throw new Error(error.message);
    }

    const paid = company.depositStatus === "paid";
    const fulfillment = await client.from("organization_sis_fulfillment_jobs").upsert(
      {
        organization_id: sis.id,
        order_id: orderId,
        status: paid ? "ready_for_production" : "locked_pending_payment",
      },
      { onConflict: "order_id" },
    );
    if (fulfillment.error) {
      throw new Error(fulfillment.error.message);
    }
  }

  const existingParties = await client
    .from("organization_sis_party_events")
    .select("id, host_name")
    .eq("organization_id", sis.id);
  if (existingParties.error) {
    throw new Error(existingParties.error.message);
  }
  const partyIdByHost = new Map(
    ((existingParties.data ?? []) as Array<{ id: string; host_name: string }>).map((row) => [row.host_name, row.id]),
  );

  for (const company of companies) {
    const due = isoDateFromToday(company.daysUntilDue);
    const payload = {
      organization_id: sis.id,
      lead_id: leadIdByRequest.get(company.leadRequestId),
      stage: ownerUserId ? company.partyStage : "won_follow_up",
      host_name: company.contactName,
      preferred_contact_method: "phone",
      party_type: company.partyType,
      guest_count: company.guestCount,
      preferred_date: due,
      party_starts_at: `${due}T17:00:00`,
      address: company.address,
      city: company.city,
      venue_type: company.venueType,
      door_hanger_theme: company.theme,
      deposit_status: company.depositStatus,
      total_due: company.totalDue,
      amount_paid: company.amountPaid,
      calendar_status: company.calendarStatus,
      customer_confirmation_status: company.customerConfirmation,
      owner_user_id: ownerUserId,
      next_action: company.nextAction,
      next_action_due: due,
      created_by: ownerUserId,
    };
    const existingId = partyIdByHost.get(company.contactName);
    if (existingId) {
      const { error } = await client.from("organization_sis_party_events").update(payload).eq("id", existingId);
      if (error) throw new Error(error.message);
    } else {
      const inserted = await client.from("organization_sis_party_events").insert(payload).select("id").maybeSingle();
      if (inserted.error) throw new Error(inserted.error.message);
      const id = (inserted.data as { id?: string } | null)?.id;
      if (id) partyIdByHost.set(company.contactName, id);
    }

    const partyId = partyIdByHost.get(company.contactName);
    if (!partyId) continue;
    const existingActivity = await client
      .from("organization_sis_activity_events")
      .select("id")
      .eq("organization_id", sis.id)
      .eq("entity_id", partyId)
      .eq("event_type", "demo_seeded");
    if (existingActivity.error) {
      throw new Error(existingActivity.error.message);
    }
    if (((existingActivity.data ?? []) as unknown[]).length === 0) {
      const { error } = await client.from("organization_sis_activity_events").insert({
        organization_id: sis.id,
        actor_user_id: ownerUserId,
        entity_type: "party_event",
        entity_id: partyId,
        event_type: "demo_seeded",
        summary: `DEMO ${company.name} party booked for ${company.contactName}. Atlas will not contact this fake record.`,
        payload: { ...demoMetadata, seed_key: company.seedKey },
      });
      if (error) throw new Error(error.message);
    }
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
