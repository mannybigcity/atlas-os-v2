import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import handler from "../functions/overnight-engine.mjs";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
delete process.env.RESEND_API_KEY;

const prospect = {
  id: "p1",
  business_name: "Acme",
  status: "contacted",
  next_action: null,
  next_action_at: null,
  last_contacted_at: null,
  fit_score: 80,
  approved_channels: ["email"],
  contact_name: "Pat",
  contact_email: "pat@acme.test",
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  delete globalThis.fetch;
});

function installEngineMock({ briefExists, draftsExist }) {
  const calls = [];
  const state = { briefExists, draftsExist };

  globalThis.fetch = async (url, init = {}) => {
    const method = (init.method || "GET").toUpperCase();
    const path = String(url).replace("https://example.supabase.co/rest/v1/", "");
    calls.push({ method, path, body: init.body ? JSON.parse(init.body) : null });

    if (path.startsWith("engine_runs") && method === "POST") {
      return jsonResponse([{ id: "run-1" }]);
    }
    if (path.startsWith("engine_runs") && method === "PATCH") {
      return jsonResponse([{ id: "run-1" }]);
    }
    if (path.startsWith("atlas_sales_prospects")) {
      return jsonResponse([prospect]);
    }
    if (path.startsWith("atlas_contact_suppressions")) {
      return jsonResponse([]);
    }
    if (path.startsWith("engine_drafts") && method === "GET") {
      return jsonResponse(
        state.draftsExist ? [{ prospect_id: "p1", kind: "next_action" }] : [],
      );
    }
    if (path.startsWith("engine_drafts") && method === "POST") {
      state.draftsExist = true;
      return jsonResponse([{ id: "d1" }]);
    }
    if (path.startsWith("morning_briefs") && method === "GET") {
      assert.match(path, /brief_date=eq\.\d{4}-\d{2}-\d{2}/);
      assert.match(path, /organization_id=is\.null/);
      return jsonResponse(state.briefExists ? [{ id: "b1" }] : []);
    }
    if (path.startsWith("morning_briefs") && method === "POST") {
      state.briefExists = true;
      return jsonResponse([{ id: "b1" }]);
    }
    if (path.startsWith("morning_briefs") && method === "PATCH") {
      return jsonResponse([{ id: "b1" }]);
    }
    throw new Error(`unexpected ${method} ${path}`);
  };

  return calls;
}

test("first run inserts founder brief and drafts", async () => {
  const calls = installEngineMock({ briefExists: false, draftsExist: false });
  const res = await handler();
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(body.drafts, 1);

  const briefPosts = calls.filter((c) => c.method === "POST" && c.path === "morning_briefs");
  assert.equal(briefPosts.length, 1);
  assert.equal(briefPosts[0].body.brief_date, new Date().toISOString().slice(0, 10));
  assert.ok(briefPosts[0].body.subject.startsWith("AFE morning brief"));

  const draftPosts = calls.filter((c) => c.method === "POST" && c.path === "engine_drafts");
  assert.equal(draftPosts.length, 1);
});

test("second same-day run patches founder brief and skips duplicate drafts", async () => {
  const calls = installEngineMock({ briefExists: true, draftsExist: true });
  const res = await handler();
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(body.drafts, 0);

  assert.equal(
    calls.filter((c) => c.method === "POST" && c.path === "morning_briefs").length,
    0,
  );
  const patches = calls.filter(
    (c) => c.method === "PATCH" && c.path.startsWith("morning_briefs?id=eq.b1"),
  );
  assert.equal(patches.length, 1);
  assert.equal(patches[0].body.emailed_at, null);
  assert.ok(patches[0].body.subject.startsWith("AFE morning brief"));
  assert.ok(patches[0].body.body_md.includes("While you slept"));
  assert.equal(patches[0].body.engine_run_id, "run-1");
  assert.equal(calls.filter((c) => c.method === "POST" && c.path === "engine_drafts").length, 0);
});
