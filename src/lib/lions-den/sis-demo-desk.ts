import { isSisOrganization } from "../client-portal/identity.ts";

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

  return { status: "skipped" as const, reason: "sis_must_not_receive_sample_desk" };
}

export function seedSqlMutatesSisOrganizationIdentity(sql: string) {
  const withoutComments = sql.replace(/--.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
  return /^\s*update\s+(public\.)?organizations\b/im.test(withoutComments);
}
