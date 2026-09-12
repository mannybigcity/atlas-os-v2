import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  clientProfileFromForm,
  clientProfileSummary,
  readClientProfile,
  withClientProfile,
} from "./client-profile.ts";
import {
  noteFollowUpPlan,
  noteRecordHref,
  noteRecordOptions,
  notesForRecord,
  notesOnDay,
  parseNoteRecord,
} from "./note-links.ts";

const id = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";

test("parseNoteRecord accepts kind:uuid only", () => {
  assert.deepEqual(parseNoteRecord(`client:${id}`), { kind: "client", id });
  assert.equal(parseNoteRecord(`vendor:${id}`), null);
  assert.equal(parseNoteRecord("client:not-a-uuid"), null);
  assert.equal(parseNoteRecord(""), null);
  assert.equal(noteRecordHref({ kind: "prospect", id }), `/client/prospects/${id}`);
  assert.equal(noteRecordHref({ kind: "sis_customer", id }), `/client/clients/${id}`);
});

test("noteRecordOptions groups prospects and clients from both record tables", () => {
  const options = noteRecordOptions(
    {
      opportunities: [
        { id, name: "Rosa's Bakery", stage: "contacted" },
        { id: other, name: "Amanda White", stage: "won" },
        { id: other, name: "Gone", stage: "archived" },
      ],
      sisCustomers: [{ id, displayName: "Carlos Ruiz", businessName: "Ruiz Tacos" }],
    },
    false,
  );
  assert.deepEqual(options.prospects.map((o) => o.label), ["Rosa's Bakery"]);
  assert.deepEqual(options.clients.map((o) => o.label), ["Amanda White", "Carlos Ruiz · Ruiz Tacos"]);
  assert.equal(options.clients[1].value, `sis_customer:${id}`);
});

test("notesForRecord and notesOnDay filter the board", () => {
  const notes = [
    { id: "a", recordId: id, recordKind: "client" as const, createdAt: "2026-09-12T15:00:00Z" },
    { id: "b", recordId: null, recordKind: null, createdAt: "2026-09-11T15:00:00Z" },
  ];
  assert.deepEqual(notesForRecord(notes, { kind: "client", id }).map((n) => n.id), ["a"]);
  assert.equal(notesForRecord(notes, null).length, 2);
  assert.deepEqual(notesOnDay(notes, "2026-09-12").map((n) => n.id), ["a"]);
});

test("a dated follow-up note becomes the record's next step; other notes do not", () => {
  const plan = noteFollowUpPlan({ noteType: "follow-up", title: "Follow-up: Call about the roof", body: "Ask about the deposit", dueDate: "2026-09-15" });
  assert.deepEqual(plan, { nextAction: "Call about the roof — Ask about the deposit", nextActionDue: "2026-09-15" });
  assert.equal(noteFollowUpPlan({ noteType: "follow-up", title: "x", body: "", dueDate: "" }), null);
  assert.equal(noteFollowUpPlan({ noteType: "general", title: "x", body: "", dueDate: "2026-09-15" }), null);
});

test("client profile lives under metadata.client_profile on either record table", () => {
  const profile = clientProfileFromForm((name) =>
    ({ address: " 12 Main St ", preferredContact: "whatsapp", service: "Roof repair", referredBy: "", bestTime: "after 5", tags: "vip, repeat" })[name],
  );
  const metadata = withClientProfile({ google_place_id: "abc" }, profile);
  assert.equal(metadata.google_place_id, "abc");
  assert.equal(readClientProfile(metadata).address, "12 Main St");
  assert.equal(readClientProfile(metadata).preferredContact, "whatsapp");
  assert.equal(readClientProfile({ client_profile: { preferredContact: "fax" } }).preferredContact, "");
  assert.equal(clientProfileSummary(profile, false).length, 5);
  assert.equal(clientProfileSummary(readClientProfile(null), true).length, 0);
});

test("contract: notes link to records both ways and never contact anyone", () => {
  const actions = readFileSync(new URL("../../server/notes/actions.ts", import.meta.url), "utf8");
  assert.match(actions, /parseNoteRecord\(formData\.get\("record"\)\)/);
  assert.match(actions, /event_type: "note_added"/);
  assert.match(actions, /next_action_due: plan\.nextActionDue/);
  assert.match(actions, /record_kind: record\?\.kind/);
  assert.doesNotMatch(actions, /sendLeadEmail|sendOwnerSms|fetch\(/);

  const board = readFileSync(new URL("../../components/lions-den/lions-den-notes.tsx", import.meta.url), "utf8");
  assert.match(board, /name="record"/);
  assert.match(board, /name="dueDate"/);
  assert.match(board, /data-note-record/);

  const panel = readFileSync(new URL("../../components/lions-den/linked-notes-panel.tsx", import.meta.url), "utf8");
  assert.match(panel, /getOrganizationNotes\(organizationId, \{ recordId: record\.id/);
  assert.match(panel, /action=\{createOrganizationNote\}/);

  for (const page of ["../../app/client/prospects/[id]/page.tsx", "../../app/client/clients/[id]/page.tsx"]) {
    const source = readFileSync(new URL(page, import.meta.url), "utf8");
    assert.match(source, /<LinkedNotesPanel/);
    assert.match(source, /<ClientProfileForm/);
  }
  const clientsPage = readFileSync(new URL("../../app/client/clients/[id]/page.tsx", import.meta.url), "utf8");
  assert.match(clientsPage, /recordTable="sis_customer"/);
  assert.match(clientsPage, /recordTable="opportunity"/);

  const migration = readFileSync(
    new URL("../../../supabase/migrations/20260913030000_notes_linked_records.sql", import.meta.url),
    "utf8",
  );
  assert.match(migration, /add column if not exists record_id uuid/);
});
