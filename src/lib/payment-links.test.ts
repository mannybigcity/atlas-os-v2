import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  ATLAS_PAYMENT_LINK_DEFAULTS,
  RETIRED_ATLAS_PAYMENT_LINKS,
  getAtlasPlanPaymentLinks,
  isRetiredAtlasPaymentLink,
  resolveAtlasPaymentLink,
} from "./payment-links.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

test("checkout buttons use the setup-fee Payment Links and ignore retired monthly-only links", () => {
  assert.deepEqual(getAtlasPlanPaymentLinks(), ATLAS_PAYMENT_LINK_DEFAULTS);
  assert.equal(
    resolveAtlasPaymentLink("basic", RETIRED_ATLAS_PAYMENT_LINKS[0]),
    ATLAS_PAYMENT_LINK_DEFAULTS.basic,
  );
  assert.equal(
    resolveAtlasPaymentLink("grow", `${RETIRED_ATLAS_PAYMENT_LINKS[1]}/`),
    ATLAS_PAYMENT_LINK_DEFAULTS.grow,
  );
  assert.equal(
    resolveAtlasPaymentLink("unlimited", `${RETIRED_ATLAS_PAYMENT_LINKS[2]}?prefilled_email=a@b.co`),
    ATLAS_PAYMENT_LINK_DEFAULTS.unlimited,
  );
  assert.equal(resolveAtlasPaymentLink("elite", ""), ATLAS_PAYMENT_LINK_DEFAULTS.elite);
  assert.equal(resolveAtlasPaymentLink("basic", "not a url"), ATLAS_PAYMENT_LINK_DEFAULTS.basic);
  assert.equal(isRetiredAtlasPaymentLink(ATLAS_PAYMENT_LINK_DEFAULTS.basic), false);
  assert.equal(isRetiredAtlasPaymentLink(RETIRED_ATLAS_PAYMENT_LINKS[0]), true);

  const newer = "https://buy.stripe.com/test_replacement_link";
  assert.equal(resolveAtlasPaymentLink("basic", newer), newer);

  const pricing = readFileSync(join(root, "src/app/pricing/page.tsx"), "utf8");
  const homepage = readFileSync(join(root, "src/components/atlas-homepage.tsx"), "utf8");
  const billing = readFileSync(join(root, "src/server/stripe/billing.ts"), "utf8");
  assert.match(pricing, /planPaymentLinks\[plan\.slug\]/);
  assert.doesNotMatch(pricing, /plan\.slug === "elite" \? withSiteLanguage\("\/start-trial"/);
  assert.match(homepage, /Choose Elite/);
  assert.match(homepage, /planPaymentLinks\[plan\.slug\]/);
  assert.match(billing, /planFromCheckoutLineItems/);
  assert.match(billing, /listLineItems\(session\.id, \{ limit: 100 \}\)/);
  assert.doesNotMatch(billing, /listLineItems\(session\.id, \{ limit: 1 \}\)/);
  assert.doesNotMatch(billing, /lineItems\.data\[0\]/);
});
