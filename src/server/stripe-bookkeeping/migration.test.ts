import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const migrationPath = resolve(process.cwd(), "supabase/migrations/20261020150000_stripe_bookkeeping.sql");

test("stripe bookkeeping migration keeps tokens server-side and workspace scoped", async () => {
  const sql = await readFile(migrationPath, "utf8");

  for (const table of [
    "stripe_bookkeeping_connections",
    "stripe_bookkeeping_secrets",
    "stripe_bookkeeping_oauth_states",
    "stripe_bookkeeping_transactions",
    "stripe_bookkeeping_category_rules",
    "stripe_bookkeeping_webhook_receipts",
  ]) {
    assert.match(sql, new RegExp(`create table public\\.${table}\\b`));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(sql, new RegExp(`revoke all on public\\.${table} from public, anon, authenticated`));
  }

  assert.match(sql, /access_token_ciphertext/);
  assert.match(sql, /refresh_token_ciphertext/);
  assert.doesNotMatch(sql, /create policy[\s\S]{0,180}on public\.stripe_bookkeeping_secrets/);
  assert.doesNotMatch(sql, /grant select on public\.stripe_bookkeeping_secrets to/);
  assert.doesNotMatch(sql, /grant select on public\.stripe_bookkeeping_oauth_states/);
  assert.match(sql, /grant select on public\.stripe_bookkeeping_transactions to authenticated/);
  assert.match(sql, /on delete cascade/);
  assert.match(sql, /unique \(organization_id, stripe_object_id\)/);
  assert.match(sql, /category in \('sales', 'refunds', 'fees', 'payouts', 'uncategorized'\)/);
  assert.match(sql, /membership\.user_id = auth\.uid\(\)/);
  assert.doesNotMatch(sql, /charge_write|payout_write|customer_write/);
});
