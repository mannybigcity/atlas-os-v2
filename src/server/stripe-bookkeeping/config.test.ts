import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { isStripeBookkeepingEnabled, loadStripeBookkeepingConfig } from "./config.ts";

const ENV_KEYS = [
  "STRIPE_BOOKKEEPING_ENABLED",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_WEBHOOK_SECRET_TEST",
  "STRIPE_BOOKKEEPING_WEBHOOK_SECRET",
  "STRIPE_BOOKKEEPING_WEBHOOK_SECRET_TEST",
] as const;

function withEnv(values: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>>, run: () => void) {
  const previous = new Map<string, string | undefined>();

  for (const key of ENV_KEYS) {
    previous.set(key, process.env[key]);
    const next = values[key];
    if (next === undefined) delete process.env[key];
    else process.env[key] = next;
  }

  try {
    run();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("bookkeeping stays off unless STRIPE_BOOKKEEPING_ENABLED is true", () => {
  withEnv({ STRIPE_BOOKKEEPING_ENABLED: undefined }, () => {
    assert.equal(isStripeBookkeepingEnabled(), false);
    assert.equal(loadStripeBookkeepingConfig().enabled, false);
  });

  withEnv({ STRIPE_BOOKKEEPING_ENABLED: "false" }, () => {
    assert.equal(isStripeBookkeepingEnabled(), false);
  });

  withEnv({ STRIPE_BOOKKEEPING_ENABLED: "true" }, () => {
    assert.equal(isStripeBookkeepingEnabled(), true);
  });
});

test("bookkeeping webhook secrets do not fall back to the billing webhook secret", () => {
  withEnv(
    {
      STRIPE_BOOKKEEPING_ENABLED: undefined,
      STRIPE_WEBHOOK_SECRET: "whsec_billing_live",
      STRIPE_WEBHOOK_SECRET_TEST: "whsec_billing_test",
      STRIPE_BOOKKEEPING_WEBHOOK_SECRET: undefined,
      STRIPE_BOOKKEEPING_WEBHOOK_SECRET_TEST: undefined,
    },
    () => {
      assert.deepEqual(loadStripeBookkeepingConfig().webhookSecrets, []);
    },
  );

  withEnv(
    {
      STRIPE_WEBHOOK_SECRET: "whsec_billing_live",
      STRIPE_WEBHOOK_SECRET_TEST: "whsec_billing_test",
      STRIPE_BOOKKEEPING_WEBHOOK_SECRET: "whsec_books_live",
      STRIPE_BOOKKEEPING_WEBHOOK_SECRET_TEST: "whsec_books_test",
    },
    () => {
      const secrets = loadStripeBookkeepingConfig().webhookSecrets;

      assert.deepEqual(secrets, ["whsec_books_live", "whsec_books_test"]);
      assert.equal(secrets.includes("whsec_billing_live"), false);
      assert.equal(secrets.includes("whsec_billing_test"), false);
    },
  );
});

test("bookkeeping config source names only the bookkeeping webhook secrets", () => {
  const source = readFileSync(new URL("./config.ts", import.meta.url), "utf8");

  assert.match(source, /STRIPE_BOOKKEEPING_WEBHOOK_SECRET/);
  assert.match(source, /STRIPE_BOOKKEEPING_WEBHOOK_SECRET_TEST/);
  assert.equal(source.includes("STRIPE_WEBHOOK_SECRET"), false);
});

test("example env keeps the billing webhook secret separate from bookkeeping", () => {
  const example = readFileSync(resolve(process.cwd(), ".env.example"), "utf8");
  const billingSecrets = example.match(/^STRIPE_WEBHOOK_SECRET=/gm) ?? [];

  assert.equal(billingSecrets.length, 1);
  assert.match(example, /^STRIPE_BOOKKEEPING_ENABLED=false$/m);
  assert.match(example, /^STRIPE_BOOKKEEPING_WEBHOOK_SECRET=$/m);
  assert.match(example, /^STRIPE_BOOKKEEPING_WEBHOOK_SECRET_TEST=$/m);
  assert.equal(example.includes("STRIPE_WEBHOOK_SECRET_TEST"), false);
});
