import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { trialInboxPreviewHref } from "./trial-inbox.ts";
import { lionsDenHref } from "./client-hub.ts";
import { micahGalleryImageActorDecision } from "../../server/content-studio/gallery-image.ts";
import {
  CLIENT_VIEW_WITHHELD,
  canSeeClientViewNav,
  clientViewOpenHref,
  clientViewTextHasPrivateContact,
  forClientView,
  isClientViewDesk,
  rememberClientView,
  scrubClientViewText,
  selectClientViewDesks,
} from "./client-view.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

test("Client View is an AFE operator action and never opens SIS, sample, or the operator desk", () => {
  const operator = { name: "Atlas For Entrepreneurs", slug: "atlas-for-entrepreneurs" };
  const trial = { name: "Bright Path Cleaning", slug: "bright-path-cleaning-2ead43" };
  const sis = { name: "SIS Custom Creations", slug: "sis-diy-big-complete-showcase" };
  const sample = { name: "Sample desk", slug: "afe-crm-demo" };
  const qtime = { name: "QTime Productions", slug: "qtime-productions" };

  assert.equal(
    canSeeClientViewNav({ isSuperAdmin: true, isClientPreview: false, organization: operator }),
    true,
  );
  assert.equal(
    canSeeClientViewNav({ isSuperAdmin: true, isClientPreview: true, organization: operator }),
    false,
  );
  assert.equal(
    canSeeClientViewNav({ isSuperAdmin: false, isClientPreview: false, organization: operator }),
    false,
  );
  assert.equal(
    canSeeClientViewNav({ isSuperAdmin: true, isClientPreview: false, organization: trial }),
    false,
  );
  assert.equal(
    canSeeClientViewNav({ isSuperAdmin: true, isClientPreview: false, organization: sis }),
    false,
  );

  assert.equal(isClientViewDesk(trial), true);
  assert.equal(isClientViewDesk(operator), false);
  assert.equal(isClientViewDesk(sis), false);
  assert.equal(isClientViewDesk(sample), false);
  assert.equal(isClientViewDesk(qtime), false);
});

test("Client View open keeps previewOrg and adds the privacy flag without changing trial inbox links", () => {
  assert.equal(
    clientViewOpenHref("bright-path-cleaning-2ead43"),
    "/client?previewOrg=bright-path-cleaning-2ead43&clientView=1",
  );
  assert.equal(
    trialInboxPreviewHref("bright-path-cleaning-2ead43"),
    "/client?previewOrg=bright-path-cleaning-2ead43",
  );
  assert.equal(
    lionsDenHref("/client/micah", "bright-path-cleaning-2ead43", "bright-path-cleaning-2ead43"),
    "/client/micah?previewOrg=bright-path-cleaning-2ead43&workspace=bright-path-cleaning-2ead43",
  );
  assert.equal(
    lionsDenHref("/client/hunter", "bright-path-cleaning-2ead43", undefined, true),
    "/client/hunter?previewOrg=bright-path-cleaning-2ead43&clientView=1",
  );

  const params = new URLSearchParams();
  rememberClientView(params, { get: (name) => (name === "clientView" ? "1" : null) });
  assert.equal(params.get("clientView"), "1");
  const plain = new URLSearchParams();
  rememberClientView(plain, { get: () => null });
  assert.equal(plain.get("clientView"), null);
});

test("Client View list is AFE desks only, labeled client or trial, and omits contact fields", () => {
  const rows = selectClientViewDesks(
    [
      { id: "op", name: "Atlas For Entrepreneurs", slug: "atlas-for-entrepreneurs", createdAt: "2026-09-01" },
      { id: "sis", name: "SIS Custom Creations", slug: "sis-diy-big-complete-showcase", createdAt: "2026-09-02" },
      { id: "paid", name: "Cypress Pest Pros", slug: "cypress-pest-pros", createdAt: "2026-08-01" },
      { id: "trial", name: "Bright Path Cleaning", slug: "bright-path-cleaning-2ead43", createdAt: "2026-09-05" },
      { id: "sample", name: "Sample desk", slug: "afe-crm-demo", createdAt: "2026-09-06" },
    ],
    new Set(["paid"]),
  );

  assert.deepEqual(
    rows.map((row) => [row.slug, row.kind]),
    [
      ["bright-path-cleaning-2ead43", "trial"],
      ["cypress-pest-pros", "client"],
    ],
  );
  assert.equal(rows[0]?.openHref, clientViewOpenHref("bright-path-cleaning-2ead43"));
  assert.equal(JSON.stringify(rows).includes("@"), false);
  assert.equal(JSON.stringify(rows).includes("phone"), false);
});

test("privacy filter withholds contact, payment, credentials, and message bodies with PII", () => {
  const desk = forClientView(true, {
    name: "Cypress Pest Pros",
    stage: "qualified",
    contactEmail: "owner@pest.example",
    contactPhone: "(281) 555-0148",
    formattedAddress: "123 Main St, Cypress, TX",
    websiteUrl: "https://pest.example",
    googleMapsUrl: "https://maps.google.com/?q=123+Main+St",
    payLink: "https://buy.stripe.com/test_123",
    metadata: {
      national_phone_number: "2815550148",
      formatted_address: "123 Main St",
      client_profile: { address: "45 Oak Lane", service: "Quarterly spray" },
      password: "hunter2",
    },
    events: [
      { summary: "Call logged", body: "Spoke with owner@pest.example about Thursday." },
      { summary: "Note", body: "Left a voicemail. No details yet." },
    ],
    caption: "Quarterly pest check. Book at owner@pest.example or call 281-555-0148.",
    imageUrl: "https://files.example/card.png",
    title: "Thursday card",
  });

  assert.equal(desk.name, "Cypress Pest Pros");
  assert.equal(desk.stage, "qualified");
  assert.equal(desk.title, "Thursday card");
  assert.equal(desk.imageUrl, "https://files.example/card.png");
  assert.equal(desk.websiteUrl, "https://pest.example");
  assert.equal(desk.contactEmail, null);
  assert.equal(desk.contactPhone, null);
  assert.equal(desk.formattedAddress, null);
  assert.equal(desk.googleMapsUrl, null);
  assert.equal(desk.payLink, null);
  assert.equal(desk.metadata.national_phone_number, null);
  assert.equal(desk.metadata.formatted_address, null);
  assert.equal(desk.metadata.client_profile.address, null);
  assert.equal(desk.metadata.client_profile.service, "Quarterly spray");
  assert.equal(desk.metadata.password, null);
  assert.equal(desk.events[0]?.body, CLIENT_VIEW_WITHHELD);
  assert.equal(desk.events[1]?.body, "Left a voicemail. No details yet.");
  assert.equal(desk.caption.includes("owner@pest.example"), false);
  assert.equal(desk.caption.includes("281-555-0148"), false);
  assert.match(desk.caption, /Quarterly pest check/);
  assert.equal(forClientView(false, { contactEmail: "owner@pest.example" }).contactEmail, "owner@pest.example");
  assert.equal(clientViewTextHasPrivateContact("Call (713) 555-0100 today"), true);
  assert.equal(scrubClientViewText("Meet at 10 Main Street tomorrow").includes("10 Main Street"), false);
});

test("Client View page, nav, and MICAH upload stay on the admin desk", () => {
  const page = readFileSync(join(root, "src/app/client/client-view/page.tsx"), "utf8");
  const hub = readFileSync(join(root, "src/components/lions-den/lions-den-client-hub.tsx"), "utf8");
  const micah = readFileSync(join(root, "src/app/client/micah/page.tsx"), "utf8");
  const context = readFileSync(join(root, "src/server/client-workspace/context.ts"), "utf8");

  assert.match(page, /canSeeClientViewNav/);
  assert.match(page, /listAfeClientViewDesks/);
  assert.match(page, /LionsDenBoardScreen board="client-view"/);
  assert.doesNotMatch(page, /contactEmail|contactPhone|owner email/i);
  assert.match(hub, /showClientView/);
  assert.match(hub, /client-view/);
  assert.match(micah, /canUploadImage=\{workspace\.isSuperAdmin\}/);
  assert.match(micah, /forClientView\(workspace\.clientView/);
  assert.match(context, /clientView/);
  assert.equal(micahGalleryImageActorDecision({ signedIn: true, isSuperAdmin: true }), "allow");
});
