import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { AFE_CALL_TODAY_EN, AFE_MANNY_PHONE_DISPLAY, AFE_MANNY_PHONE_TEL } from "../afe-public-contact.ts";
import { amandaSequenceSteps } from "./amanda-outreach.ts";
import { amandaClose, nextMessage, nextMessageOwnerFromBusiness } from "./next-message-engine.ts";
import {
  DELEANA_NAME,
  DELEANA_PHONE_DISPLAY,
  applyFounderContactKit,
  correctDeleanaSpelling,
  founderContactLinesFor,
  founderUrgentCallCopy,
} from "./founder-contact-kit.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const readRepo = (rel: string) => readFileSync(join(root, rel), "utf8");

const sisOrg = { name: "SIS Custom Creations", slug: "sis-diy-big-complete-showcase" };
const afeOrg = { name: "Atlas For Entrepreneurs", slug: "atlas-for-entrepreneurs" };

test("locked founder numbers: SIS uses both, AFE uses Manny only, tenants keep their own phone", () => {
  assert.equal(AFE_MANNY_PHONE_DISPLAY, "346-544-8621");
  assert.equal(DELEANA_PHONE_DISPLAY, "346-544-8697");
  assert.equal(correctDeleanaSpelling("Call Delina today"), "Call Deleana today");

  const sis = founderContactLinesFor(sisOrg);
  assert.deepEqual(sis, [
    { name: "Manny", phone: "346-544-8621" },
    { name: "Deleana", phone: "346-544-8697" },
  ]);

  const afe = founderContactLinesFor(afeOrg);
  assert.deepEqual(afe, [{ name: "Manny", phone: "346-544-8621" }]);
  assert.equal(founderContactLinesFor({ name: "Cypress Plumbing", slug: "cypress-plumbing-trial" }), null);
  assert.equal(founderContactLinesFor({ name: "Sample desk", slug: "afe-crm-demo" }), null);
});

test("Amanda templates replace a wrong Delina phone on SIS and keep Manny-only on AFE", () => {
  const wrong = applyFounderContactKit(
    {
      businessName: "SIS Custom Creations",
      trade: "party setups",
      ownerName: "Delina Ramirez",
      ownerPhone: "(832) 555-0100",
    },
    sisOrg,
  );
  assert.equal(wrong.ownerName, "Deleana Ramirez");
  assert.equal(wrong.ownerPhone, "346-544-8621");
  assert.deepEqual(wrong.contactLines, [
    { name: "Manny", phone: "346-544-8621" },
    { name: DELEANA_NAME, phone: "346-544-8697" },
  ]);

  const steps = amandaSequenceSteps({
    business: wrong,
    prospect: { prospectName: "Jordan Host" },
    spanish: false,
  });
  for (const step of steps) {
    assert.match(step.body, /Manny answers at 346-544-8621/);
    assert.match(step.body, /Deleana answers at 346-544-8697/);
    assert.doesNotMatch(step.body, /Delina|832-555-0100|\(832\)/);
  }

  const afe = applyFounderContactKit(
    {
      businessName: "Atlas For Entrepreneurs",
      trade: "business systems",
      ownerName: "Manny",
      ownerPhone: "713-555-0199",
    },
    afeOrg,
  );
  assert.equal(afe.ownerPhone, "346-544-8621");
  assert.deepEqual(afe.contactLines, [{ name: "Manny", phone: "346-544-8621" }]);
  assert.doesNotMatch(JSON.stringify(afe), /346-544-8697|Deleana/);

  const tenant = applyFounderContactKit(
    {
      businessName: "Cypress Plumbing",
      trade: "plumbing",
      ownerName: "Manny",
      ownerPhone: "(281) 555-0199",
    },
    { name: "Cypress Plumbing", slug: "cypress-plumbing-trial" },
  );
  assert.equal(tenant.ownerPhone, "(281) 555-0199");
  assert.equal(tenant.contactLines, undefined);
});

test("Next Message Engine close on SIS lists both locked numbers", () => {
  const owner = nextMessageOwnerFromBusiness(
    applyFounderContactKit(
      { ownerName: "Delina", businessName: "SIS Custom Creations", ownerPhone: "713-555-0000" },
      sisOrg,
    ),
  );
  assert.equal(owner.ownerFirstName, "Deleana");
  const drafted = nextMessage({
    spanish: false,
    ownerFirstName: owner.ownerFirstName,
    businessName: owner.businessName,
    ownerPhone: owner.ownerPhone,
    contactLines: owner.contactLines,
    trade: "party setups",
    city: null,
    prospectName: "Jordan Host",
    prospectCompany: null,
    prospectType: null,
    stage: "researching",
    opportunityType: "partner",
    lastTouchAt: null,
    nowIso: "2026-09-16T15:00:00.000Z",
    notesText: "",
    quoteAmount: null,
  });
  assert.match(drafted.body, /Manny answers at 346-544-8621/);
  assert.match(drafted.body, /Deleana answers at 346-544-8697/);
  assert.doesNotMatch(drafted.body, /Delina|713-555-0000/);
  assert.match(amandaClose({ ...drafted.profile, spanish: false }), /346-544-8621/);
});

test("SIS inbound receipt uses both locked numbers; AFE uses Manny only", () => {
  assert.match(
    founderUrgentCallCopy(founderContactLinesFor(sisOrg), false) ?? "",
    /call Manny at 346-544-8621 or Deleana at 346-544-8697/,
  );
  assert.match(
    founderUrgentCallCopy(founderContactLinesFor(afeOrg), true) ?? "",
    /llama directo al 346-544-8621/,
  );
  assert.doesNotMatch(founderUrgentCallCopy(founderContactLinesFor(afeOrg), false) ?? "", /Deleana|8697/);
});

test("AFE public homepage Call today is Manny only and Amanda templates never spell Delina", () => {
  const homepage = readRepo("src/components/atlas-homepage.tsx");
  const header = readRepo("src/components/site-header.tsx");
  const publicContact = readRepo("src/lib/afe-public-contact.ts");
  const queries = readRepo("src/server/outreach/queries.ts");
  assert.match(homepage, /callToday:\s*AFE_CALL_TODAY_EN/);
  assert.match(homepage, /\{t\.callToday\}/);
  assert.match(homepage, /tel:\$\{AFE_MANNY_PHONE_TEL\}/);
  assert.match(header, /AFE_CALL_TODAY_EN/);
  assert.match(header, /tel:\$\{AFE_MANNY_PHONE_TEL\}/);
  assert.match(queries, /applyFounderContactKit/);
  assert.match(queries, /organizationSlug/);
  assert.equal(AFE_CALL_TODAY_EN, "Call today: 346-544-8621");
  assert.equal(AFE_MANNY_PHONE_TEL, "3465448621");
  assert.doesNotMatch(homepage, /Deleana|Delina|346-544-8697|SIS Custom Creations/);
  assert.doesNotMatch(header, /Deleana|Delina|346-544-8697|SIS Custom Creations/);
  assert.doesNotMatch(publicContact, /Deleana|Delina|SIS Custom Creations|8697/);

  for (const file of [
    "src/lib/lions-den/amanda-outreach.ts",
    "src/lib/lions-den/next-message-engine.ts",
    "src/lib/lions-den/inbound-leads.ts",
    "src/lib/lions-den/founder-contact-kit.ts",
    "src/components/lions-den/desk-email-compose.tsx",
    "src/components/lions-den/amanda-sequence-card.tsx",
  ]) {
    const source = readRepo(file);
    assert.doesNotMatch(source, /\bDelina\b/, file);
  }
});
