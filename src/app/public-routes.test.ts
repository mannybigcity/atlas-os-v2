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
  "signscout",
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

test("start-trial states the Debbie path beside submit and login separates sample desk from sign-in", () => {
  const trial = readFileSync(join(root, "src/app/start-trial/page.tsx"), "utf8");
  const login = readFileSync(join(root, "src/app/login/page.tsx"), "utf8");

  assert.match(trial, /No card required/);
  assert.match(trial, /Email verification is required before the starter workspace opens/);
  assert.match(trial, /No necesitas tarjeta/);
  assert.match(
    trial,
    /After the 7 days, Debbie onboards you for \$500, then you get 2 weeks free before a paid plan\./,
  );
  assert.match(
    trial,
    /Después de los 7 días, Debbie te incorpora por \$500 y luego tienes 2 semanas gratis antes de un plan de pago\./,
  );
  assert.match(trial, /\{copy\.afterTrial\}/);
  assert.doesNotMatch(trial, /2 months|two months|dos meses/i);

  assert.match(login, /Sign in/);
  assert.match(login, /Preview the sample desk/);
  assert.match(login, /Ver el escritorio de muestra/);
  assert.match(login, /Start 7-day free trial/);
  assert.doesNotMatch(login, /Create an account|Crea una cuenta|Show the desk|Mostrar el escritorio/);
});

test("Atlas contact page exists, is bilingual, and is listed in the sitemap and footer", () => {
  const contact = readFileSync(join(root, "src/app/contact/page.tsx"), "utf8");
  assert.match(contact, /atlasforentrepreneurs@gmail\.com/);
  assert.match(contact, /Contact Atlas/);
  assert.match(contact, /Contacto/);
  assert.match(contact, /\/start-trial/);

  const sitemap = readFileSync(join(root, "src/lib/public-marketing-site.ts"), "utf8");
  assert.match(sitemap, /path: "\/contact"/);

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
