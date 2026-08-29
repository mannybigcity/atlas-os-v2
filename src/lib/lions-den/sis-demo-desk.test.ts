import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  assertSisDemoSeedIsSafe,
  getSisDemoDeskSeed,
  seedSqlMutatesSisOrganizationIdentity,
  sisDemoDeskWriteTables,
  upsertSisDemoDeskRecords,
} from "./sis-demo-desk.ts";

const sqlPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../supabase/migrations/20260829224500_sis_lions_den_demo_desk.sql",
);

test("DEMO desk records are labeled, fake, and never named SIS Custom Creations", () => {
  const seed = getSisDemoDeskSeed();
  assert.doesNotThrow(() => assertSisDemoSeedIsSafe(seed));
  assert.deepEqual(
    seed.prospects.map((item) => item.name),
    ["ABC Plumbing (DEMO)", "123 Catering (DEMO)", "XYZ Electric (DEMO)"],
  );
  assert.equal(seed.prospects[0]?.daysUntilDue, 0);
  assert.equal(seed.prospects[1]?.daysUntilDue, 1);
  assert.equal(seed.prospects[2]?.daysUntilDue, 7);
  assert.match(seed.pendingHunter.name, /DEMO/);
  assert.equal(seed.notes.length, 3);
  assert.match(seed.micahDraft.title, /ABC Plumbing/);
  assert.match(seed.micahDraft.caption, /Do not publish/);
  for (const prospect of seed.prospects) {
    assert.match(prospect.contactEmail, /@example\.invalid$/);
    assert.equal(prospect.name.includes("SIS Custom Creations"), false);
  }
});

test("SQL seed does not update organizations and matches SIS by isSisOrganization rules", () => {
  const sql = readFileSync(sqlPath, "utf8");
  assert.equal(seedSqlMutatesSisOrganizationIdentity(sql), false);
  assert.match(sql, /is_sis_protected_organization/);
  assert.match(sql, /sis-diy/);
  assert.match(sql, /before update on public\.organizations/);
  assert.doesNotMatch(sql, /slug\s*=\s*'sis-custom-creations'/i);
  assert.match(sql, /ABC Plumbing \(DEMO\)/);
  assert.match(sql, /123 Catering \(DEMO\)/);
  assert.match(sql, /XYZ Electric \(DEMO\)/);
  assert.match(sql, /Oak Street Vinyl \(DEMO\)/);
  assert.match(sql, /demo\+abc-plumbing@example\.invalid/);
  assert.match(sql, /FOUNDER/);
});

test("in-repo upsert is idempotent and never writes organizations", async () => {
  const writes: string[] = [];
  const organizations = [
    { id: "org-qtime", name: "QTime Productions", slug: "qtime-productions" },
    { id: "org-sis", name: "SIS Custom Creations", slug: "SIS-DIY-big-complete-showcase" },
  ];
  const notes: Array<{ title: string; organization_id: string }> = [];

  const client = {
    from(table: string) {
      writes.push(table);
      return {
        select() {
          const result = {
            data: table === "organizations" ? organizations : table === "organization_notes" ? notes : [],
            error: null,
            eq() {
              return result;
            },
          };
          return result;
        },
        upsert() {
          return { error: null };
        },
        insert(rows: Array<{ title: string; organization_id: string }>) {
          notes.push(...rows);
          return { error: null };
        },
      };
    },
  };

  const first = await upsertSisDemoDeskRecords(client);
  assert.equal(first.status, "applied");
  if (first.status === "applied") {
    assert.equal(first.organizationId, "org-sis");
  }
  assert.equal(writes.includes("organizations"), true);
  assert.equal(sisDemoDeskWriteTables().includes("organization_opportunities"), true);

  const second = await upsertSisDemoDeskRecords(client);
  assert.equal(second.status, "applied");
  assert.equal(notes.filter((note) => note.title === "DEMO: ABC Plumbing").length, 1);
});

test("upsert skips when no SIS organization exists", async () => {
  const client = {
    from() {
      return {
        select() {
          return {
            data: [{ id: "org-qtime", name: "QTime Productions", slug: "qtime-productions" }],
            error: null,
          };
        },
      };
    },
  };

  const result = await upsertSisDemoDeskRecords(client);
  assert.deepEqual(result, { status: "skipped", reason: "sis_organization_not_found" });
});
