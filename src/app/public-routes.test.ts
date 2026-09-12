import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function walk(dir: string, out: string[] = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(tsx?|css)$/.test(entry) && !/\.test\.ts$/.test(entry)) out.push(full);
  }
  return out;
}

// Authenticated workspace routes (/client, /lions-den, /api) may legitimately
// reference SIS as a client account. Everything a logged-out visitor can reach
// must be Atlas-branded only.
const PUBLIC_APP_DIRS = [
  "accessibility",
  "assessment",
  "checkout",
  "contact",
  "forgot-password",
  "go",
  "login",
  "pricing",
  "privacy",
  "reset-password",
  "responsible-ai",
  "security",
  "set-password",
  "start-trial",
  "starter",
  "success",
  "terms",
];
const PUBLIC_COMPONENTS = [
  "atlas-homepage.tsx",
  "legal-page.tsx",
  "route-footer.tsx",
  "site-footer.tsx",
  "site-header.tsx",
];

test("no SIS Custom Creations pages, components, or assets ship on the Atlas public site", () => {
  assert.equal(existsSync(join(root, "src/app/[page]")), false, "catch-all [page] route must stay deleted");
  assert.equal(existsSync(join(root, "src/components/sis-shell.tsx")), false);
  assert.equal(existsSync(join(root, "src/components/sis-homepage.tsx")), false);

  const files = [join(root, "src/app/page.tsx"), join(root, "src/app/layout.tsx")];
  for (const dir of PUBLIC_APP_DIRS) {
    const full = join(root, "src/app", dir);
    if (existsSync(full)) walk(full, files);
  }
  for (const component of PUBLIC_COMPONENTS) {
    const full = join(root, "src/components", component);
    if (existsSync(full)) files.push(full);
  }

  for (const file of files) {
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(source, /SIS Custom Creations|siscustomcreations\.com|sis-real\/|SisHeader|sis-homepage/, file);
  }
});

test("Atlas contact page exists, is bilingual, and is listed in the sitemap and footer", () => {
  const contact = readFileSync(join(root, "src/app/contact/page.tsx"), "utf8");
  assert.match(contact, /atlasforentrepreneurs@gmail\.com/);
  assert.match(contact, /Contact Atlas/);
  assert.match(contact, /Contacto/);
  assert.match(contact, /\/start-trial/);

  const sitemap = readFileSync(join(root, "src/app/sitemap.ts"), "utf8");
  assert.match(sitemap, /\/contact`/);

  const footer = readFileSync(join(root, "src/components/site-footer.tsx"), "utf8");
  assert.match(footer, /"\/contact"/);
});

test("legal pages route email to the Atlas inbox, not a third-party brand", () => {
  for (const page of ["terms", "responsible-ai", "accessibility", "privacy"]) {
    const file = join(root, `src/app/${page}/page.tsx`);
    if (!existsSync(file)) continue;
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(/mailto:([^"?]+)/g)) {
      assert.equal(match[1], "atlasforentrepreneurs@gmail.com", `${page}: ${match[0]}`);
    }
  }
});
