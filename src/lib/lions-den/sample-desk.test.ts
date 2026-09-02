import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  assertSampleDeskSeedIsSafe,
  getSampleDeskSeed,
  sampleDeskWriteTables,
  seedSqlTouchesForbiddenLogin,
  upsertSampleDeskRecords,
} from "./sample-desk.ts";
import {
  FOUNDER_MAILBOX_EMAIL,
  SAMPLE_DESK_LOGIN_EMAIL,
} from "../client-portal/identity.ts";

const sqlPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../supabase/migrations/20260902180000_sample_desk_isolated.sql",
);
const membershipSqlPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../supabase/manual/provision-sample-desk-login.sql",
);

function createSeedClient(organizations: Array<{ id: string; name: string; slug: string }>) {
  const store: Record<string, Array<Record<string, unknown>>> = {
    organizations: organizations.map((row) => ({ ...row })),
    organization_opportunities: [],
    organization_opportunity_events: [],
    organization_hunter_review_items: [],
    organization_notes: [],
    note_messages: [],
  };

  function matches(row: Record<string, unknown>, filters: Array<[string, unknown]>) {
    return filters.every(([key, value]) => row[key] === value);
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
      return false;
    });
  }

  return {
    store,
    from(table: string) {
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

test("sample desk seed is ABC/123/XYZ, fake, and never SIS", () => {
  const seed = getSampleDeskSeed();
  assert.doesNotThrow(() => assertSampleDeskSeedIsSafe(seed));
  assert.deepEqual(
    seed.prospects.map((item) => item.name),
    ["ABC Plumbing", "123 Catering", "XYZ Electric"],
  );
  assert.equal(seed.pendingHunter.name, "Oak Street Vinyl");
  for (const prospect of seed.prospects) {
    assert.match(prospect.contactEmail, /@example\.invalid$/);
    assert.match(prospect.contactPhone, /555/);
    assert.equal(prospect.name.includes("SIS Custom Creations"), false);
    assert.doesNotMatch(prospect.name, /\bDEMO\b/);
  }
  assert.equal(sampleDeskWriteTables().includes("organization_opportunities"), true);
});

test("sample desk upsert writes afe-crm-demo and never SIS", async () => {
  const client = createSeedClient([
    { id: "org-sis", name: "SIS Custom Creations", slug: "SIS-DIY-big-complete-showcase" },
    { id: "org-afe", name: "Sample desk", slug: "afe-crm-demo" },
  ]);
  const first = await upsertSampleDeskRecords(client);
  assert.equal(first.status, "applied");
  if (first.status === "applied") {
    assert.equal(first.organizationId, "org-afe");
  }
  assert.equal(client.store.organization_opportunities.length, 3);
  assert.equal(client.store.organization_opportunities[0]?.organization_id, "org-afe");
  assert.equal(client.store.organization_hunter_review_items.some((row) => row.status === "pending"), true);
  assert.equal(client.store.organization_notes.length, 3);

  const second = await upsertSampleDeskRecords(client);
  assert.equal(second.status, "applied");
  assert.equal(client.store.organization_opportunities.length, 3);
});

test("isolated sample desk SQL never seeds SIS and never attaches the founder mailbox", () => {
  const sql = readFileSync(sqlPath, "utf8");
  assert.equal(seedSqlTouchesForbiddenLogin(sql), false);
  assert.match(sql, /afe-crm-demo/);
  assert.match(sql, /Sample desk/);
  assert.match(sql, /ABC Plumbing/);
  assert.match(sql, /123 Catering/);
  assert.match(sql, /XYZ Electric/);
  assert.match(sql, /Oak Street Vinyl/);
  assert.match(sql, /sis_lions_den_demo_desk/);
  assert.doesNotMatch(sql, /insert\s+into\s+(public\.)?organization_memberships/i);
  assert.equal(sql.toLowerCase().includes(FOUNDER_MAILBOX_EMAIL), false);

  const membershipSql = readFileSync(membershipSqlPath, "utf8");
  assert.match(membershipSql, new RegExp(SAMPLE_DESK_LOGIN_EMAIL.replace("+", "\\+")));
  assert.match(membershipSql, /DEMO_LOGIN_EMAIL/);
  assert.match(membershipSql, /DEMO_LOGIN_PASSWORD/);
  assert.match(membershipSql, /<> 'atlasforentrepreneurs@gmail.com'/);
});
