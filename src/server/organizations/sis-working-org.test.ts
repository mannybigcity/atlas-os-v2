import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

test("founder SIS ensure never overwrites identity or seeds DEMO fixtures", () => {
  const source = readFileSync(join(root, "src/server/organizations/sis-working-org.ts"), "utf8");
  assert.match(source, /SIS_WORKING_ORG_NAME/);
  assert.match(source, /sis-diy-big-complete-showcase|SIS_LIONS_DEN_PREVIEW_SLUG/);
  assert.match(source, /isSisOrganization/);
  assert.match(source, /organization_memberships/);
  assert.match(source, /role:\s*"owner"/);
  assert.match(source, /canEnsureSisWorkingOrg/);
  assert.doesNotMatch(source, /\.update\(/);
  assert.doesNotMatch(source, /industry/);
  assert.doesNotMatch(source, /ABC Plumbing|123 Catering|XYZ Electric/);
  assert.doesNotMatch(source, /upsertSisDemoDeskRecords|upsertSampleDeskRecords/);
  assert.doesNotMatch(source, /afe-crm-demo|AFE_CRM_DEMO/);
});
