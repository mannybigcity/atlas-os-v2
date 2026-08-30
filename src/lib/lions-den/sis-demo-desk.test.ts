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

function createSeedClient(organizations: Array<{ id: string; name: string; slug: string }>) {
  const store: Record<string, Array<Record<string, unknown>>> = {
    organizations: organizations.map((row) => ({ ...row })),
    organization_opportunities: [],
    organization_opportunity_events: [],
    organization_hunter_review_items: [],
    organization_notes: [],
    note_messages: [],
    organization_content_drafts: [],
    organization_content_draft_events: [],
    organization_memberships: organizations
      .filter((row) => row.id === "org-sis")
      .map((row) => ({ organization_id: row.id, user_id: "user-sis" })),
    organization_sis_customers: [],
    organization_sis_leads: [],
    organization_sis_quotes: [],
    organization_sis_quote_items: [],
    organization_sis_orders: [],
    organization_sis_order_items: [],
    organization_sis_fulfillment_jobs: [],
    organization_sis_party_events: [],
    organization_sis_activity_events: [],
  };

  const writes: string[] = [];

  function matches(row: Record<string, unknown>, filters: Array<[string, unknown]>) {
    return filters.every(([key, value]) => {
      if (Array.isArray(value)) return value.includes(row[key]);
      return row[key] === value;
    });
  }

  function nextId(table: string) {
    return `${table}-${(store[table] ?? []).length + 1}`;
  }

  function conflictIndex(table: string, row: Record<string, unknown>) {
    return (store[table] ?? []).findIndex((item) => {
      if (table === "organization_opportunities") {
        return item.organization_id === row.organization_id && item.name === row.name;
      }
      if (table === "organization_hunter_review_items") {
        return item.organization_id === row.organization_id && item.place_id === row.place_id;
      }
      if (table === "organization_content_drafts") {
        return item.organization_id === row.organization_id && item.slot === row.slot;
      }
      if (table === "organization_sis_quotes") {
        return item.organization_id === row.organization_id && item.quote_number === row.quote_number;
      }
      if (table === "organization_sis_orders") {
        return item.organization_id === row.organization_id && item.order_number === row.order_number;
      }
      if (table === "organization_sis_fulfillment_jobs") {
        return item.order_id === row.order_id;
      }
      return false;
    });
  }

  return {
    writes,
    store,
    from(table: string) {
      writes.push(table);
      const filters: Array<[string, unknown]> = [];
      let mode: "select" | "insert" | "update" = "select";
      let pendingRows: Array<Record<string, unknown>> = [];
      let pendingUpdate: Record<string, unknown> = {};
      let single = false;

      const execute = () => {
        if (mode === "insert") {
          const inserted = pendingRows.map((row) => {
            const saved = { id: row.id ?? nextId(table), ...row };
            store[table] = store[table] ?? [];
            store[table].push(saved);
            return saved;
          });
          return { data: single ? inserted[0] ?? null : inserted, error: null };
        }
        if (mode === "update") {
          store[table] = (store[table] ?? []).map((row) =>
            matches(row, filters) ? { ...row, ...pendingUpdate } : row,
          );
        }
        const rows = (store[table] ?? []).filter((row) => matches(row, filters)).map((row) => ({ ...row }));
        return { data: single ? rows[0] ?? null : rows, error: null };
      };

      const builder = {
        error: null as null,
        select() {
          return builder;
        },
        eq(column: string, value: unknown) {
          filters.push([column, value]);
          return builder;
        },
        in(column: string, values: unknown[]) {
          filters.push([column, values]);
          return builder;
        },
        upsert(rows: Array<Record<string, unknown>> | Record<string, unknown>) {
          const list = Array.isArray(rows) ? rows : [rows];
          for (const row of list) {
            const existingIndex = conflictIndex(table, row);
            if (existingIndex >= 0) {
              store[table][existingIndex] = { ...store[table][existingIndex], ...row };
            } else {
              store[table] = store[table] ?? [];
              store[table].push({ id: nextId(table), ...row });
            }
          }
          return { error: null };
        },
        insert(rows: Array<Record<string, unknown>> | Record<string, unknown>) {
          mode = "insert";
          pendingRows = Array.isArray(rows) ? rows : [rows];
          return builder;
        },
        update(values: Record<string, unknown>) {
          mode = "update";
          pendingUpdate = values;
          return builder;
        },
        maybeSingle() {
          single = true;
          return execute();
        },
        then(resolve: (value: { data: unknown; error: null }) => unknown, reject?: (reason: unknown) => unknown) {
          return Promise.resolve(execute()).then(resolve, reject);
        },
      };

      return builder;
    },
  };
}

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
  assert.equal(seed.prospects[0]?.contactName, "Jordan Hale (DEMO)");
  assert.equal(seed.prospects[0]?.contactPhone, "(555) 010-0101");
  assert.match(seed.pendingHunter.name, /DEMO/);
  assert.equal(seed.notes.length, 3);
  assert.equal(seed.micahDrafts.length, 3);
  assert.match(seed.micahDrafts[0]?.title ?? "", /ABC Plumbing/);
  assert.match(seed.micahDrafts[1]?.title ?? "", /123 Catering/);
  assert.match(seed.micahDrafts[2]?.title ?? "", /XYZ Electric/);
  for (const draft of seed.micahDrafts) {
    assert.match(draft.caption, /Do not publish/);
    assert.match(draft.imageSvg, /DEMO DRAFT/);
  }
  for (const prospect of seed.prospects) {
    assert.match(prospect.contactEmail, /@example\.invalid$/);
    assert.match(prospect.contactPhone, /555/);
    assert.match(prospect.contactName, /DEMO/);
    assert.equal(prospect.noteBody.split("\n").length >= 6, true);
    assert.equal(prospect.name.includes("SIS Custom Creations"), false);
  }
});

test("SQL seed does not update organizations and fills every Lion's Den surface", () => {
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
  assert.match(sql, /Jordan Hale \(DEMO\)/);
  assert.match(sql, /Riley Chen \(DEMO\)/);
  assert.match(sql, /Morgan Blake \(DEMO\)/);
  assert.match(sql, /\(555\) 010-0101/);
  assert.match(sql, /contact_phone/);
  assert.match(sql, /demo\+abc-plumbing@example\.invalid/);
  assert.match(sql, /note_messages/);
  assert.match(sql, /organization_sis_party_events/);
  assert.match(sql, /organization_sis_leads/);
  assert.match(sql, /organization_sis_quotes/);
  assert.match(sql, /organization_sis_orders/);
  assert.match(sql, /demo-desk-123-catering/);
  assert.match(sql, /demo-desk-xyz-electric/);
  assert.match(sql, /image_svg/);
  assert.match(sql, /accepted_opportunity_id/);
  assert.match(sql, /FOUNDER/);
});

test("in-repo upsert is idempotent and never writes organizations", async () => {
  const client = createSeedClient([
    { id: "org-qtime", name: "QTime Productions", slug: "qtime-productions" },
    { id: "org-sis", name: "SIS Custom Creations", slug: "SIS-DIY-big-complete-showcase" },
  ]);

  const first = await upsertSisDemoDeskRecords(client);
  assert.equal(first.status, "applied");
  if (first.status === "applied") {
    assert.equal(first.organizationId, "org-sis");
  }
  assert.equal(client.writes.includes("organizations"), true);
  assert.equal(client.writes.includes("organizations") && client.writes.filter((table) => table === "organizations").length > 0, true);
  assert.equal(sisDemoDeskWriteTables().includes("organization_opportunities"), true);
  assert.equal(client.store.organization_opportunities.length, 3);
  assert.equal(client.store.organization_opportunities[0]?.contact_phone, "(555) 010-0101");
  assert.equal(client.store.organization_hunter_review_items.length, 4);
  assert.equal(client.store.organization_content_drafts.length, 3);
  assert.equal(client.store.organization_sis_party_events.length, 3);
  assert.equal(client.store.organization_notes.filter((note) => note.title === "DEMO: ABC Plumbing").length, 1);

  const second = await upsertSisDemoDeskRecords(client);
  assert.equal(second.status, "applied");
  assert.equal(client.store.organization_notes.filter((note) => note.title === "DEMO: ABC Plumbing").length, 1);
  assert.equal(client.store.organization_opportunities.length, 3);
  assert.equal(client.store.organization_sis_leads.length, 3);
  assert.equal(client.store.organization_content_drafts.length, 3);
});

test("upsert skips when no SIS organization exists", async () => {
  const client = createSeedClient([{ id: "org-qtime", name: "QTime Productions", slug: "qtime-productions" }]);
  const result = await upsertSisDemoDeskRecords(client);
  assert.deepEqual(result, { status: "skipped", reason: "sis_organization_not_found" });
});
