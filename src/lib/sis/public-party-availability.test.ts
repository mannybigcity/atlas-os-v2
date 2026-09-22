import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  monthBounds,
  parsePublicPartyHold,
  publicAvailabilityDays,
  publicAvailabilityResponse,
  publicHoldsFromSlotRows,
  suggestPublicSlots,
} from "./public-party-availability.ts";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

test("public month days shade bright until both blocks are held and hide host details", () => {
  const days = publicAvailabilityDays({
    monthKey: "2026-09",
    today: "2026-09-22",
    holds: [
      { date: "2026-09-24", slot: "am" },
      { date: "2026-09-26", slot: "am" },
      { date: "2026-09-26", slot: "pm" },
      { date: "2026-09-20", slot: "pm" },
    ],
  });
  assert.ok(days);
  const open = days.find((day) => day.date === "2026-09-23");
  const one = days.find((day) => day.date === "2026-09-24");
  const full = days.find((day) => day.date === "2026-09-26");
  const past = days.find((day) => day.date === "2026-09-20");
  assert.equal(open?.shade, "bright");
  assert.equal(open?.bookable, true);
  assert.equal(one?.shade, "bright");
  assert.equal(one?.am, "held");
  assert.equal(one?.pm, "open");
  assert.equal(full?.shade, "light");
  assert.equal(full?.bookable, false);
  assert.equal(past?.bookable, false);
  assert.equal(past?.shade, "bright");

  const payload = publicAvailabilityResponse({
    monthKey: "2026-09",
    today: "2026-09-22",
    holds: [{ date: "2026-09-26", slot: "am" }],
  });
  const encoded = JSON.stringify(payload);
  assert.equal(encoded.includes("host"), false);
  assert.equal(encoded.includes("Deleana"), false);
  assert.match(encoded, /"mode":"live"/);
  assert.deepEqual(monthBounds("2026-09"), { from: "2026-09-01", to: "2026-09-30" });
  assert.equal(monthBounds("2026-13"), null);
});

test("public hold parser accepts a start inside the block and rejects a full-block double book shape", () => {
  const good = parsePublicPartyHold({
    requestId: "req-12345678",
    name: "Avery Lane",
    email: "avery@example.com",
    phone: "281-555-0148",
    partyType: "Kids Paint Parties",
    guestCount: 12,
    date: "2026-10-03",
    slot: "am",
    startTime: "10:00",
    zip: "77429",
    notes: "Backyard, ages 7-9",
    consent: true,
  });
  assert.equal(good.ok, true);
  if (good.ok) assert.equal(good.value.startTime, "10:00");

  const late = parsePublicPartyHold({
    requestId: "req-12345678",
    name: "Avery Lane",
    email: "avery@example.com",
    partyType: "Adult Paint Parties",
    date: "2026-10-03",
    slot: "pm",
    startTime: "16:00",
    consent: true,
  });
  assert.equal(late.ok, false);
  if (!late.ok && !late.honeypot) assert.ok(late.issues.includes("startTime"));

  const bot = parsePublicPartyHold({ companyWebsite: "https://spam.example", consent: true });
  assert.equal(bot.ok, false);
  if (!bot.ok) assert.equal(bot.honeypot, true);
});

test("conflict suggestions stay date and block only", () => {
  const suggestions = suggestPublicSlots({
    holds: publicHoldsFromSlotRows([{ date: "2026-09-26", slot: "am" }]),
    fromDate: "2026-09-22",
    avoid: { date: "2026-09-26", slot: "pm" },
  });
  assert.deepEqual(suggestions[0], { date: "2026-10-03", slot: "am" });
  assert.equal(JSON.stringify(suggestions).includes("host"), false);
});

test("public SQL and route stay on the SIS org and do not return host details", () => {
  const sql = read("supabase/migrations/20260922163000_sis_public_party_availability.sql");
  const list = sql.slice(sql.indexOf("function public.list_sis_party_public_slots"), sql.indexOf("function public.create_sis_party_public_hold"));
  assert.match(list, /returns table \(\s*preferred_date date,\s*party_slot text\s*\)/);
  assert.doesNotMatch(list, /host_name|email|phone|address/);
  assert.match(list, /resolve_sis_party_organization_id/);
  assert.match(sql, /is_sis_protected_organization/);
  assert.match(sql, /'tentative'/);
  assert.match(sql, /revoke all on function public.list_sis_party_public_slots\(date, date\) from public, anon, authenticated/);
  assert.match(sql, /grant execute on function public.list_sis_party_public_slots\(date, date\) to service_role/);
  assert.doesNotMatch(sql, /p_organization|afe_crm|atlas_sales_prospects/i);

  const route = read("src/app/api/sis/party-availability/route.ts");
  assert.match(route, /p_host_name: input\.hostName/);
  assert.doesNotMatch(route, /row\.host|hostName:\s*row|select\(".*host_name/);
  assert.doesNotMatch(route, /searchParams\.get\(\s*["']organization/);
  assert.match(route, /list_sis_party_public_slots/);
  assert.match(route, /create_sis_party_public_hold/);
  assert.doesNotMatch(read("src/components/lions-den/lions-den-calendar.tsx"), /party-availability/);
});
