import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260728100000_operations_registry_and_cash_ledger.sql",
);

test("operations migration contains additive tenant and ledger safeguards", async () => {
  const sql = await readFile(migrationPath, "utf8");

  for (const table of [
    "organization_projects",
    "organization_missions",
    "organization_project_events",
    "organization_mission_events",
    "organization_cash_entries",
    "organization_cash_entry_events",
  ]) {
    assert.match(sql, new RegExp(`create table public\\.${table}\\b`));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(sql, new RegExp(`revoke all on public\\.${table} from public, anon, authenticated`));
  }

  assert.ok(sql.indexOf("unique (id, organization_id)") < sql.indexOf("create table public.organization_cash_entry_events"));
  assert.match(sql, /organization_cash_entries_settled_check/);
  assert.match(sql, /verification_status = 'verified'/);
  assert.match(sql, /with check \(/g);
  assert.match(sql, /security definer/gi);
  assert.match(sql, /set search_path = public/gi);
  assert.match(sql, /revoke execute on function public\.record_organization_cash_entry_event/);
  assert.doesNotMatch(sql, /insert into public\.(organization_projects|organization_missions|organization_cash_entries)\b/i);
  assert.doesNotMatch(sql, /delete from public\.organization_/i);
});
