import assert from "node:assert/strict";
import test from "node:test";
import { categorize, defaultCategoryRules, type CategoryRule } from "./categories.ts";

test("default rules map Stripe ledger types to bookkeeping categories", () => {
  const rules = defaultCategoryRules();

  assert.equal(categorize({ stripeType: "charge", description: "", recordType: "charge" }, rules), "sales");
  assert.equal(categorize({ stripeType: "payment", description: "", recordType: "charge" }, rules), "sales");
  assert.equal(categorize({ stripeType: "refund", description: "", recordType: "refund" }, rules), "refunds");
  assert.equal(categorize({ stripeType: "payment_refund", description: "", recordType: "refund" }, rules), "refunds");
  assert.equal(categorize({ stripeType: "stripe_fee", description: "", recordType: "fee" }, rules), "fees");
  assert.equal(categorize({ stripeType: "payout", description: "", recordType: "payout" }, rules), "payouts");
  assert.equal(categorize({ stripeType: "payout_failure", description: "", recordType: "payout" }, rules), "payouts");
});

test("a higher-priority user rule overrides a default", () => {
  const rules: CategoryRule[] = [
    ...defaultCategoryRules(),
    {
      priority: 1,
      enabled: true,
      matchField: "description",
      matchOperator: "equals",
      matchValue: "Workshop deposit",
      category: "fees",
    },
  ];

  assert.equal(
    categorize(
      { stripeType: "charge", description: "Workshop deposit", recordType: "charge" },
      rules,
    ),
    "fees",
  );
});

test("disabled rules are skipped and unknown types stay uncategorized", () => {
  const rules: CategoryRule[] = [
    {
      priority: 1,
      enabled: false,
      matchField: "stripe_type",
      matchOperator: "equals",
      matchValue: "charge",
      category: "sales",
    },
  ];

  assert.equal(categorize({ stripeType: "charge", description: "", recordType: "charge" }, rules), "uncategorized");
  assert.equal(categorize({ stripeType: "adjustment", description: "", recordType: "adjustment" }, defaultCategoryRules()), "uncategorized");
});
