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
