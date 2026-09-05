import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { readSisCustomerPayPalFields } from "./sis-customers.ts";
import { visibleLionsDenBoards } from "./client-hub.ts";
import { countWonOpportunities, wonOpportunityToDeskClient } from "./desk-clients.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

test("PayPal import metadata surfaces last date and totals", () => {
  assert.deepEqual(
    readSisCustomerPayPalFields({
      import_kind: "paypal_history",
      last_date: "2026-03-18",
      invoice_total: 1840,
      payment_total: "1625.50",
    }),
    { lastDate: "2026-03-18", invoiceTotal: 1840, paymentTotal: 1625.5 },
  );
});

test("missing or invalid customer metadata does not invent PayPal totals", () => {
  assert.deepEqual(readSisCustomerPayPalFields(null), {
    lastDate: null,
    invoiceTotal: null,
    paymentTotal: null,
  });
  assert.deepEqual(readSisCustomerPayPalFields({ last_date: " ", invoice_total: "abc" }), {
    lastDate: null,
    invoiceTotal: null,
    paymentTotal: null,
  });
});

test("Clients board is on every Lion's Den desk, not SIS-only", () => {
  const sis = visibleLionsDenBoards({
    name: "SIS Custom Creations",
    slug: "sis-diy-big-complete-showcase",
  });
  const afe = visibleLionsDenBoards({
    name: "Atlas For Entrepreneurs",
    slug: "atlas-for-entrepreneurs",
  });
  const sample = visibleLionsDenBoards({ name: "Sample desk", slug: "afe-crm-demo" });
  const trial = visibleLionsDenBoards({ name: "AFE client trial", slug: "acme-landscaping" });
  const qtime = visibleLionsDenBoards({ name: "QTime Productions", slug: "qtime-productions" });

  assert.equal(sis.some((board) => board.id === "clients"), true);
  assert.equal(sis.find((board) => board.id === "clients")?.href, "/client/clients");
  assert.equal(afe.some((board) => board.id === "clients"), true);
  assert.equal(sample.some((board) => board.id === "clients"), true);
  assert.equal(trial.some((board) => board.id === "clients"), true);
  assert.equal(qtime.some((board) => board.id === "clients"), false);
  assert.equal(sis.some((board) => board.id === "trial-inbox"), false);
  assert.equal(sample.some((board) => board.id === "trial-inbox"), false);
  assert.equal(trial.some((board) => board.id === "trial-inbox"), false);
  assert.equal(afe.some((board) => board.id === "trial-inbox"), false);
});

test("Clients page loads SIS customers or won opportunities and never adds send actions", () => {
  const page = readFileSync(join(root, "src/app/client/clients/page.tsx"), "utf8");
  const board = readFileSync(join(root, "src/components/lions-den/lions-den-clients.tsx"), "utf8");
  const hub = readFileSync(join(root, "src/components/lions-den/lions-den-client-hub.tsx"), "utf8");
  const overview = readFileSync(join(root, "src/components/lions-den/lions-den-overview.tsx"), "utf8");
  const sisQueries = readFileSync(join(root, "src/server/sis-workspace/queries.ts"), "utf8");
  const opportunityQueries = readFileSync(join(root, "src/server/opportunities/queries.ts"), "utf8");

  assert.match(page, /LionsDenBoardScreen board="clients"/);
  assert.match(page, /isSisOrganization/);
  assert.match(page, /getSisCustomers/);
  assert.match(page, /getWonOpportunities/);
  assert.match(page, /wonOpportunityToDeskClient/);
  assert.doesNotMatch(page, /if \(!isSisOrganization\(workspace\.primaryOrganization\)\)/);
  assert.match(sisQueries, /organization_sis_customers/);
  assert.match(sisQueries, /getSisCustomers/);
  assert.match(opportunityQueries, /getWonOpportunities/);
  assert.match(opportunityQueries, /\.eq\("stage", "won"\)/);
  assert.match(board, /No clients yet/);
  assert.match(board, /does not call, email, or text/);
  assert.match(hub, /visibleLionsDenBoards/);
  assert.match(overview, /countWonOpportunities/);
  assert.match(overview, /href\("\/client\/clients"\)/);
  assert.doesNotMatch(board, /mailto:/);
  assert.doesNotMatch(board, /tel:/);
  assert.doesNotMatch(board, /sms:/);
  assert.doesNotMatch(board, /type="submit"/);
});

test("won opportunities map to the interim Clients list without mixing SIS fields", () => {
  const client = wonOpportunityToDeskClient({
    id: "opp-1",
    name: "Harbor Grill",
    contactName: "Maya Chen",
    contactEmail: "maya@harborgrill.example",
    contactPhone: "555-0100",
    sourceLabel: "HUNTER",
    researchSummary: "  Booked catering for the spring mixer.  ",
    createdAt: "2026-08-01T00:00:00.000Z",
  });

  assert.deepEqual(client, {
    id: "opp-1",
    displayName: "Harbor Grill",
    businessName: null,
    contactName: "Maya Chen",
    email: "maya@harborgrill.example",
    phone: "555-0100",
    notes: "Booked catering for the spring mixer.",
    sourceLabel: "HUNTER",
    lastDate: null,
    invoiceTotal: null,
    paymentTotal: null,
    createdAt: "2026-08-01T00:00:00.000Z",
  });
  assert.equal(countWonOpportunities([{ stage: "won" }, { stage: "researching" }, { stage: "won" }]), 2);
  assert.equal(countWonOpportunities([]), 0);
});
