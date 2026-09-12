import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  deskQuoteStatusActions,
  deskQuoteStatusLabel,
  deskQuoteText,
  formatUsd,
  latestDeskQuote,
  newDeskQuote,
  normalizePayLink,
  readDeskQuotes,
  validateDeskQuote,
  validatePayLink,
  withDeskQuote,
} from "./desk-quote.ts";

const root = join(process.cwd(), "src");
const read = (path: string) => readFileSync(join(root, path), "utf8");

test("a quote needs a job, a price, and a shelf life; junk becomes a notice", () => {
  const good = validateDeskQuote({ description: "Replace 40-gal water heater, haul away old unit", amount: "$1,850", validDays: "14" }, false);
  assert.deepEqual(good.errors, {});
  assert.equal(good.amountUsd, 1850);
  assert.equal(good.validDays, 14);
  const defaults = validateDeskQuote({ description: "Drain clean", amount: "250", validDays: "" }, false);
  assert.equal(defaults.validDays, 14, "blank valid days falls back to 14");
  const bad = validateDeskQuote({ description: "x", amount: "free", validDays: "400" }, true);
  assert.deepEqual(Object.keys(bad.errors).sort(), ["amount", "description", "validDays"]);
  assert.match(bad.errors.amount ?? "", /precio/);
});

test("quotes live on the record newest first, capped, and survive junk rows", () => {
  const now = new Date(2026, 8, 12, 15, 0);
  const first = newDeskQuote({ id: "q1", description: "Drain clean", amountUsd: 250, validDays: 14, by: "owner@example.com", now });
  assert.equal(first.status, "drafted");
  assert.equal(first.validUntil, "2026-09-26");
  assert.equal(first.by, "owner@example.com");
  let metadata: Record<string, unknown> = { owner_notes: "keep me" };
  metadata = withDeskQuote(metadata, first);
  const second = newDeskQuote({ id: "q2", description: "Water heater", amountUsd: 1850, validDays: 7, now: new Date(2026, 8, 13) });
  metadata = withDeskQuote(metadata, second);
  assert.equal(metadata.owner_notes, "keep me");
  assert.deepEqual(readDeskQuotes(metadata).map((item) => item.id), ["q2", "q1"]);
  assert.equal(latestDeskQuote(metadata)?.id, "q2");
  metadata = withDeskQuote(metadata, { ...first, status: "sent", statusAt: "2026-09-12T20:00:00.000Z" });
  assert.equal(readDeskQuotes(metadata).find((item) => item.id === "q1")?.status, "sent");
  assert.equal(readDeskQuotes(metadata).length, 2, "replacing does not duplicate");
  assert.deepEqual(readDeskQuotes({ quotes: [null, { id: "bad" }, "x"] }), []);
  assert.deepEqual(readDeskQuotes({}), []);
  for (let index = 0; index < 30; index += 1) {
    metadata = withDeskQuote(metadata, newDeskQuote({ id: `bulk-${index}`, description: "Job", amountUsd: 10, validDays: 1, now: new Date(2026, 9, index + 1) }));
  }
  assert.equal(readDeskQuotes(metadata).length, 20);
});

test("the quote text is short, has one price, and carries the owner's own pay link", () => {
  const quote = newDeskQuote({ id: "q", description: "Replace water heater.\nHaul away old unit.", amountUsd: 1850, validDays: 14, now: new Date(2026, 8, 12) });
  const en = deskQuoteText({ quote, prospectName: "Cedar Ridge HOA", contactName: "Dana", businessName: "Cypress Plumbing", payLink: "https://pay.example/cypress", spanish: false });
  assert.equal(en.subject, "Quote · Cedar Ridge HOA · $1,850");
  assert.match(en.body, /^Hi Dana,/);
  assert.match(en.body, /Total: \$1,850/);
  assert.match(en.body, /Price good through September 26\./);
  assert.match(en.body, /To pay or leave a deposit: https:\/\/pay\.example\/cypress/);
  assert.match(en.body, /Thanks,\nCypress Plumbing$/);
  const es = deskQuoteText({ quote, prospectName: "Cedar Ridge HOA", spanish: true });
  assert.match(es.body, /^Hola,/);
  assert.match(es.body, /Precio válido hasta el 26 de septiembre\./);
  assert.doesNotMatch(es.body, /pagar/, "no pay line when the owner has no pay link");
  assert.equal(formatUsd(1200.5), "$1,200.50");
  assert.equal(formatUsd(300), "$300");
});

test("quote status buttons move forward only; accepted and declined are final", () => {
  assert.deepEqual(deskQuoteStatusActions("drafted", false).map((item) => item.status), ["sent", "accepted", "declined"]);
  assert.deepEqual(deskQuoteStatusActions("sent", true).map((item) => item.label), ["Aceptaron · ganado", "Dijeron no"]);
  assert.deepEqual(deskQuoteStatusActions("accepted", false), []);
  assert.deepEqual(deskQuoteStatusActions("declined", false), []);
  assert.equal(deskQuoteStatusLabel("drafted", false), "Written, not sent");
  assert.equal(deskQuoteStatusLabel("sent", true), "Enviada");
});

test("a pay link may be a URL or a plain how-to-pay line", () => {
  assert.equal(normalizePayLink("  pay.example/cypress "), "https://pay.example/cypress");
  assert.equal(normalizePayLink("https://square.link/u/abc"), "https://square.link/u/abc");
  assert.equal(normalizePayLink("Zelle to 713-555-0100 or check on the day"), "Zelle to 713-555-0100 or check on the day");
  assert.equal(normalizePayLink(""), "");
  assert.equal(validatePayLink("", false), null);
  assert.equal(normalizePayLink("ab"), "", "too short to mean anything; clears the field");
  assert.equal(validatePayLink("ab", false), null);
  assert.match(validatePayLink("x".repeat(501), false) ?? "", /too long/);
});

test("accepting a quote makes the prospect a won client with the job value filled in, and nothing sends", () => {
  const actions = read("server/opportunities/desk-quote-actions.ts");
  const card = read("components/lions-den/desk-quote-card.tsx");
  const detail = read("components/lions-den/lions-den-prospect-detail.tsx");
  const compose = read("components/lions-den/desk-email-compose.tsx");
  const email = read("server/opportunities/desk-email-actions.ts");
  const migration = read("../supabase/migrations/20260913010000_desk_settings_pay_link.sql");

  assert.match(actions, /export async function createDeskQuote/);
  assert.match(actions, /export async function setDeskQuoteStatus/);
  assert.match(actions, /export async function saveDeskPayLink/);
  assert.match(actions, /stage: "won"/);
  assert.match(actions, /\[JOB_VALUE_METADATA_KEY\]: quote\.amountUsd/);
  assert.match(actions, /eventType: "won"/);
  assert.doesNotMatch(actions, /api\.resend\.com|twilio|sms:|paymentLinks|stripe/i, "no money or messages move through Atlas");

  assert.match(card, /data-desk-quote/);
  assert.match(card, /Write a quote/);
  assert.match(card, /Escribir cotización/);
  assert.match(card, /deskQuoteStatusActions\(/);
  assert.match(card, /action=\{setDeskQuoteStatus\}/);
  assert.match(card, /Send by WhatsApp|Enviar por WhatsApp/);
  assert.match(card, /Atlas does not send it or collect the money/);
  assert.match(detail, /<DeskQuoteCard/);
  assert.match(detail, /payLink/);

  assert.match(compose, /initialSubject/);
  assert.match(compose, /initialBody/);
  assert.match(compose, /name="quoteId"/);
  assert.match(email, /quoteId/);
  assert.match(email, /status: "sent"/);

  assert.match(migration, /add column if not exists pay_link/);
});
