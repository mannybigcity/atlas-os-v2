import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  applyTrialLionsDenSeed,
  assertTrialDeskSeedIsSafe,
  canSeedTrialLionsDenDesk,
  getTrialLionsDenSeed,
  trialDeskSeedWriteTables,
  trialHunterSeedPlaceIds,
  trialMicahSeedSlots,
} from "./trial-desk-seed.ts";
import { AFE_OPERATOR_DESK_NAME, AFE_OPERATOR_DESK_SLUG, SAMPLE_DESK_DISPLAY_NAME } from "../client-portal/identity.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function readRepo(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

function createSeedClient(organizations: Array<{ id: string; name: string; slug: string }>) {
  const store: Record<string, Array<Record<string, unknown>>> = {
    organizations: organizations.map((row) => ({ ...row })),
    organization_opportunities: [],
    organization_opportunity_events: [],
    organization_hunter_review_items: [],
    organization_content_drafts: [],
    organization_content_draft_events: [],
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
      if (table === "organization_hunter_review_items") {
        return item.organization_id === row.organization_id && item.place_id === row.place_id;
      }
      if (table === "organization_opportunities") {
        return (
          item.organization_id === row.organization_id &&
          item.name === row.name &&
          item.opportunity_type === row.opportunity_type
        );
      }
      if (table === "organization_content_drafts") {
        return (
          item.organization_id === row.organization_id &&
          item.draft_date === row.draft_date &&
          item.slot === row.slot
        );
      }
      return false;
    });
  }

  return {
    store,
    writes,
    from(table: string) {
      const filters: Array<[string, unknown]> = [];
      let mode: "select" | "insert" | "update" = "select";
      let pendingRows: Array<Record<string, unknown>> = [];
      let single = false;

      const execute = () => {
        writes.push(`${mode}:${table}`);
        if (mode === "insert") {
          const inserted = pendingRows.map((row) => {
            const saved = { id: row.id ?? nextId(table), ...row };
            store[table] = store[table] ?? [];
            store[table].push(saved);
            return saved;
          });
          return { data: single ? inserted[0] ?? null : inserted, error: null };
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
          writes.push(`upsert:${table}`);
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

test("trial seed is a denser SAMPLE review pile, 2–3 prospects, follow-up drafts, and 7 MICAH placeholders", () => {
  const seed = getTrialLionsDenSeed({
    businessName: "Cypress Pest Pros",
    businessType: "Contractor or home service",
  });
  assert.doesNotThrow(() => assertTrialDeskSeedIsSafe(seed));
  assert.equal(seed.hunterFinds.length, 7);
  assert.equal(seed.prospects.length, 3);
  assert.equal(seed.followUps.length, 2);
  assert.equal(seed.micahSlots.length, 7);
  assert.equal(seed.market.serviceQuery, "pest control");
  assert.equal(seed.market.city, "Cypress");
  assert.deepEqual(
    seed.micahSlots.map((item) => `${item.day}:${item.weekday}`),
    ["1:Monday", "2:Tuesday", "3:Wednesday", "4:Thursday", "5:Friday", "6:Saturday", "7:Sunday"],
  );
  assert.equal(trialHunterSeedPlaceIds(seed.market).every((id) => id.startsWith("trial-seed-")), true);
  assert.deepEqual(trialMicahSeedSlots(), [
    "trial-seed-week-d1",
    "trial-seed-week-d2",
    "trial-seed-week-d3",
    "trial-seed-week-d4",
    "trial-seed-week-d5",
    "trial-seed-week-d6",
    "trial-seed-week-d7",
  ]);
  const writeTables: readonly string[] = trialDeskSeedWriteTables();
  assert.equal(writeTables.includes("organization_opportunities"), true);
  assert.equal(writeTables.includes("organization_sis_customers"), false);
  for (const find of seed.hunterFinds) {
    assert.match(find.name, /pest|termite|mosquito|rodent|wildlife|exterminator/i);
    assert.match(find.formattedAddress, /Cypress/);
    assert.match(find.searchQuery, /pest control/);
  }
  for (const prospect of seed.prospects) {
    assert.match(prospect.name, /\bSAMPLE\b/);
    assert.match(prospect.researchSummary, /Do not visit or contact/);
  }
  assert.equal(seed.followUps.every((row) => row.daysUntilDue != null), true);
});

test("trial seed never invents phones, SIS, sample desk, Faith, or auto-send", () => {
  const seed = getTrialLionsDenSeed({
    businessName: "Massive Action Maintenance",
    businessType: "Contractor or home service",
  });
  const blob = JSON.stringify(seed);
  assert.doesNotMatch(blob, /phone/i);
  assert.doesNotMatch(blob, /555/);
  assert.doesNotMatch(blob, /ABC Plumbing|123 Catering|XYZ Electric|Oak Street Vinyl/);
  assert.doesNotMatch(blob, /SIS Custom Creations|afe-crm-demo/i);
  assert.doesNotMatch(blob, /\bfaith\b/i);
  assert.doesNotMatch(blob, /auto-?send|already sent|was sent/i);
  assert.equal(seed.market.vertical, "maintenance");
  for (const find of seed.hunterFinds) {
    assert.match(find.name, /\bSAMPLE\b/);
    assert.match(find.searchQuery, /SAMPLE/);
    assert.match(find.searchQuery, /no live Places search/);
  }
  for (const slot of seed.micahSlots) {
    assert.match(slot.caption, /SAMPLE/);
    assert.match(slot.caption, /did not post/);
    assert.match(slot.callToAction, /Do not expect Atlas to post/i);
  }
});

test("eligibility is new trial orgs only — never SIS, sample, or operator", () => {
  const trial = { id: "org-trial", name: "Bright Path Cleaning", slug: "bright-path-cleaning-2ead43" };
  assert.equal(canSeedTrialLionsDenDesk({ organization: trial, hasTrialProfile: true }), true);
  assert.equal(canSeedTrialLionsDenDesk({ organization: trial, hasTrialProfile: false }), false);
  assert.equal(
    canSeedTrialLionsDenDesk({
      organization: { id: "org-sis", name: "SIS Custom Creations", slug: "sis-diy-big-complete-showcase" },
      hasTrialProfile: true,
    }),
    false,
  );
  assert.equal(
    canSeedTrialLionsDenDesk({
      organization: { id: "org-sample", name: SAMPLE_DESK_DISPLAY_NAME, slug: "afe-crm-demo" },
      hasTrialProfile: true,
    }),
    false,
  );
  assert.equal(
    canSeedTrialLionsDenDesk({
      organization: { id: "org-ops", name: AFE_OPERATOR_DESK_NAME, slug: AFE_OPERATOR_DESK_SLUG },
      hasTrialProfile: true,
    }),
    false,
  );
});

test("apply writes pending HUNTER finds, SAMPLE prospects, follow-up drafts, and MICAH drafts once", async () => {
  const client = createSeedClient([
    { id: "org-trial", name: "Cypress Pest Pros", slug: "cypress-pest-pros-trial" },
    { id: "org-sample", name: SAMPLE_DESK_DISPLAY_NAME, slug: "afe-crm-demo" },
    { id: "org-sis", name: "SIS Custom Creations", slug: "sis-diy-big-complete-showcase" },
  ]);

  const first = await applyTrialLionsDenSeed(client, {
    organizationId: "org-trial",
    userId: "owner-1",
    hasTrialProfile: true,
    market: { businessName: "Cypress Pest Pros", businessType: "Contractor or home service" },
  });
  assert.equal(first.status, "applied");
  const pendingHunter = client.store.organization_hunter_review_items.filter((row) => row.status === "pending");
  const acceptedHunter = client.store.organization_hunter_review_items.filter((row) => row.status === "accepted");
  assert.equal(pendingHunter.length, 7);
  assert.equal(acceptedHunter.length, 3);
  assert.equal(client.store.organization_opportunities.length, 3);
  assert.equal(client.store.organization_content_drafts.length, 7);
  assert.equal(
    client.store.organization_opportunities.filter((row) => row.stage === "follow_up_queued").length,
    2,
  );
  assert.equal(
    client.store.organization_opportunities.filter((row) => row.next_action_due).length,
    2,
  );
  assert.equal(
    pendingHunter.every((row) => row.accepted_opportunity_id == null),
    true,
  );
  assert.equal(
    client.store.organization_hunter_review_items.every((row) => row.organization_id === "org-trial"),
    true,
  );
  assert.equal(
    client.store.organization_opportunities.every((row) => (row.metadata as { trial_seed?: boolean }).trial_seed),
    true,
  );
  assert.equal(
    client.store.organization_opportunities.every((row) => String(row.name).includes("SAMPLE")),
    true,
  );
  assert.equal(
    client.store.organization_opportunities.every((row) => row.contact_phone == null),
    true,
  );
  assert.equal(
    client.store.organization_content_drafts.every((row) => (row.metadata as { trial_seed?: boolean }).trial_seed),
    true,
  );
  assert.equal(
    client.store.organization_content_drafts.every(
      (row) => (row.metadata as { micah_demeanor?: string; faith_language?: boolean }).micah_demeanor === "straight",
    ),
    true,
  );
  assert.equal(
    client.store.organization_opportunity_events.some((row) => row.event_type === "follow_up_queued"),
    true,
  );

  const second = await applyTrialLionsDenSeed(client, {
    organizationId: "org-trial",
    userId: "owner-1",
    hasTrialProfile: true,
    market: { businessName: "Cypress Pest Pros", businessType: "Contractor or home service" },
  });
  assert.equal(second.status, "already_seeded");
  assert.equal(pendingHunter.length, 7);
  assert.equal(client.store.organization_hunter_review_items.length, 10);
  assert.equal(client.store.organization_opportunities.length, 3);
  assert.equal(client.store.organization_content_drafts.length, 7);
});

test("apply does not add SAMPLE finds on top of a real HUNTER pile, Prospects, or week pack", async () => {
  const client = createSeedClient([{ id: "org-trial", name: "Harbor HVAC", slug: "harbor-hvac-trial" }]);
  client.store.organization_hunter_review_items.push({
    id: "hunter-real",
    organization_id: "org-trial",
    place_id: "ChIJ-real-place",
    name: "Real Places find",
    status: "pending",
    accepted_opportunity_id: null,
  });
  client.store.organization_opportunities.push({
    id: "opp-real",
    organization_id: "org-trial",
    name: "Real Prospect",
    metadata: { trial_seed: false },
  });
  client.store.organization_content_drafts.push({
    id: "draft-real",
    organization_id: "org-trial",
    slot: "week-d1",
    metadata: { week_pack: true, week_day: 1, micah_demeanor: "straight" },
  });

  const result = await applyTrialLionsDenSeed(client, {
    organizationId: "org-trial",
    userId: "owner-1",
    hasTrialProfile: true,
  });
  assert.equal(result.status, "already_seeded");
  assert.equal(client.store.organization_hunter_review_items.length, 1);
  assert.equal(client.store.organization_opportunities.length, 1);
  assert.equal(client.store.organization_content_drafts.length, 1);
});

test("thin PR #43 seed is left alone — denser seed does not mutate old trial orgs", async () => {
  const client = createSeedClient([{ id: "org-old", name: "Bright Path Cleaning", slug: "bright-path-cleaning-2ead43" }]);
  client.store.organization_hunter_review_items.push(
    { organization_id: "org-old", place_id: "trial-seed-harbor-lane-auto", name: "Harbor Lane Auto Detail · SAMPLE", status: "pending" },
    { organization_id: "org-old", place_id: "trial-seed-pinecrest-lawn", name: "Pinecrest Lawn Care · SAMPLE", status: "pending" },
    { organization_id: "org-old", place_id: "trial-seed-midtown-print", name: "Midtown Print Shop · SAMPLE", status: "pending" },
  );

  const result = await applyTrialLionsDenSeed(client, {
    organizationId: "org-old",
    userId: "owner-old",
    hasTrialProfile: true,
    market: { businessName: "Bright Path Cleaning", businessType: "Contractor or home service" },
  });
  assert.equal(result.status, "already_seeded");
  assert.equal(client.store.organization_hunter_review_items.length, 3);
  assert.equal(client.store.organization_opportunities.length, 0);
  assert.equal(client.store.organization_content_drafts.length, 0);
});

test("apply refuses SIS and sample desk even when asked", async () => {
  const client = createSeedClient([
    { id: "org-sample", name: SAMPLE_DESK_DISPLAY_NAME, slug: "afe-crm-demo" },
    { id: "org-sis", name: "SIS Custom Creations", slug: "sis-diy-big-complete-showcase" },
  ]);

  const sample = await applyTrialLionsDenSeed(client, {
    organizationId: "org-sample",
    userId: "demo-1",
    hasTrialProfile: true,
  });
  const sis = await applyTrialLionsDenSeed(client, {
    organizationId: "org-sis",
    userId: "sis-1",
    hasTrialProfile: true,
  });
  assert.equal(sample.status, "skipped");
  assert.equal(sis.status, "skipped");
  assert.equal(client.store.organization_hunter_review_items.length, 0);
  assert.equal(client.store.organization_opportunities.length, 0);
  assert.equal(client.store.organization_content_drafts.length, 0);
});

test("workspace setup and Lion's Den load call the trial seed once-safe helper", () => {
  const workspace = readRepo("src/server/trials/workspace.ts");
  const context = readRepo("src/server/client-workspace/context.ts");
  const grants = readRepo("supabase/migrations/20260905223000_trial_desk_seed_service_role_grants.sql");
  const denserGrants = readRepo("supabase/migrations/20260906170000_trial_desk_seed_prospect_grants.sql");

  assert.match(workspace, /ensureTrialLionsDenSeed/);
  assert.match(context, /ensureTrialLionsDenSeed/);
  assert.match(grants, /organization_hunter_review_items/);
  assert.match(grants, /organization_content_drafts/);
  assert.match(grants, /service_role/);
  assert.match(denserGrants, /organization_opportunities/);
  assert.match(denserGrants, /organization_opportunity_events/);
  assert.doesNotMatch(workspace, /organization_opportunities/);
  assert.doesNotMatch(context, /upsertSampleDeskRecords|upsertSisDemoDeskRecords/);
});
