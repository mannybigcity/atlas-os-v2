import assert from "node:assert/strict";
import test from "node:test";
import { summarizeCash, transactionsToCsv, type CsvTransaction } from "./csv.ts";

const rows: CsvTransaction[] = [
  {
    occurredAt: "2026-10-01T00:00:00.000Z",
    category: "sales",
    recordType: "charge",
    stripeType: "charge",
    description: 'Deposit, "west"',
    customerName: "Ada",
    customerEmail: "ada@example.com",
    invoiceId: "in_123",
    amountMinor: 10000,
    feeMinor: 300,
    netMinor: 9700,
    currency: "USD",
    stripeObjectId: "txn_sale",
    countsInCashTotals: true,
  },
  {
    occurredAt: "2026-10-02T00:00:00.000Z",
    category: "refunds",
    recordType: "refund",
    stripeType: "refund",
    description: "Line one\nLine two",
    customerName: "",
    customerEmail: "",
    invoiceId: "",
    amountMinor: -2500,
    feeMinor: -50,
    netMinor: -2450,
    currency: "USD",
    stripeObjectId: "txn_refund",
    countsInCashTotals: true,
  },
  {
    occurredAt: "2026-10-03T00:00:00.000Z",
    category: "fees",
    recordType: "fee",
    stripeType: "stripe_fee",
    description: "Stripe billing",
    customerName: "",
    customerEmail: "",
    invoiceId: "",
    amountMinor: -200,
    feeMinor: 0,
    netMinor: -200,
    currency: "USD",
    stripeObjectId: "txn_fee",
    countsInCashTotals: true,
  },
  {
    occurredAt: "2026-10-04T00:00:00.000Z",
    category: "payouts",
    recordType: "payout",
    stripeType: "payout",
    description: "Payout",
    customerName: "",
    customerEmail: "",
    invoiceId: "",
    amountMinor: -7000,
    feeMinor: 0,
    netMinor: -7000,
    currency: "USD",
    stripeObjectId: "txn_payout",
    countsInCashTotals: true,
  },
  {
    occurredAt: "2026-10-05T00:00:00.000Z",
    category: "uncategorized",
    recordType: "invoice",
    stripeType: "invoice",
    description: "Invoice 1001",
    customerName: "Ada",
    customerEmail: "ada@example.com",
    invoiceId: "in_123",
    amountMinor: 10000,
    feeMinor: 0,
    netMinor: 10000,
    currency: "USD",
    stripeObjectId: "in_123",
    countsInCashTotals: false,
  },
];

test("csv export escapes commas, quotes, and newlines and omits secrets", () => {
  const csv = transactionsToCsv(rows);

  assert.match(csv, /^occurred_at,category,record_type,stripe_type,description,customer_name,customer_email,invoice_id,amount,fee,net,currency,stripe_id\n/);
  assert.match(csv, /"Deposit, ""west"""/);
  assert.match(csv, /"Line one\nLine two"/);
  assert.equal(csv.includes("access_token"), false);
  assert.equal(csv.includes("refresh_token"), false);
  assert.equal(csv.includes("ciphertext"), false);
});

test("cash totals include sale fees and separate fee rows, and skip invoices", () => {
  const totals = summarizeCash(rows);

  assert.equal(totals.salesMinor, 10000);
  assert.equal(totals.refundsMinor, -2500);
  assert.equal(totals.feesMinor, 300 + -50 + -200);
  assert.equal(totals.payoutsMinor, -7000);
  assert.equal(totals.netMinor, 9700 + -2450 + -200 + -7000);
  assert.equal(totals.rowCount, 4);
});
