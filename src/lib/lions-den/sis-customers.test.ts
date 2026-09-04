import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { readSisCustomerPayPalFields } from "./sis-customers.ts";
import { visibleLionsDenBoards } from "./client-hub.ts";

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

test("Clients board is SIS-only in Lion's Den nav", () => {
  const sis = visibleLionsDenBoards({
    name: "SIS Custom Creations",
    slug: "sis-diy-big-complete-showcase",
  });
  const afe = visibleLionsDenBoards({
    name: "Atlas For Entrepreneurs",
    slug: "atlas-for-entrepreneurs",
  });
  const sample = visibleLionsDenBoards({ name: "Sample desk", slug: "afe-crm-demo" });

  assert.equal(sis.some((board) => board.id === "clients"), true);
  assert.equal(sis.find((board) => board.id === "clients")?.href, "/client/clients");
  assert.equal(afe.some((board) => board.id === "clients"), false);
  assert.equal(sample.some((board) => board.id === "clients"), false);
});

test("Clients page lists SIS customers and never adds send actions", () => {
  const page = readFileSync(join(root, "src/app/client/clients/page.tsx"), "utf8");
  const board = readFileSync(join(root, "src/components/lions-den/lions-den-clients.tsx"), "utf8");
  const hub = readFileSync(join(root, "src/components/lions-den/lions-den-client-hub.tsx"), "utf8");
  const queries = readFileSync(join(root, "src/server/sis-workspace/queries.ts"), "utf8");

  assert.match(page, /LionsDenBoardScreen board="clients"/);
  assert.match(page, /isSisOrganization/);
  assert.match(page, /getSisCustomers/);
  assert.match(queries, /organization_sis_customers/);
  assert.match(queries, /getSisCustomers/);
  assert.match(board, /No clients yet/);
  assert.match(hub, /visibleLionsDenBoards/);
  assert.doesNotMatch(board, /mailto:/);
  assert.doesNotMatch(board, /tel:/);
  assert.doesNotMatch(board, /sms:/);
  assert.doesNotMatch(board, /type="submit"/);
});
