import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { LD_CHIP, LD_CHIP_SM, LD_CHIP_XS } from "./desk-chips.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function readRepo(path: string) {
  return readFileSync(join(root, path), "utf8");
}

test("desk action chips default to navy fill and white type", () => {
  assert.match(LD_CHIP, /ld-chip/);
  assert.match(LD_CHIP, /bg-\[#071b42\]/);
  assert.match(LD_CHIP, /text-white/);
  assert.match(LD_CHIP_SM, /ld-chip/);
  assert.match(LD_CHIP_XS, /ld-chip/);
  assert.doesNotMatch(LD_CHIP, /bg-white/);
  assert.doesNotMatch(LD_CHIP, /hover:bg-\[#071b42\] hover:text-white/);

  const css = readRepo("app/globals.css");
  assert.match(css, /\.ld-chip \{/);
  assert.match(css, /\.ld-chip \{\n  background-color: #071b42;/);
  assert.match(css, /\.ld-chip \{\n  background-color: #071b42;\n  border-color: #071b42;\n  color: #fff;/);
  assert.match(css, /\.ld-chip:hover/);
  assert.match(css, /background-color: #0a2a5c;/);
  assert.match(css, /outline: 2px solid #f5b932;/);

  const settings = readRepo("app/client/settings/page.tsx");
  assert.match(settings, /LD_CHIP/);
  assert.match(settings, /id="help"/);
  assert.match(settings, /Book a kickoff call/);
  assert.match(settings, /SUPPORT_EMAIL/);
  assert.match(settings, /founderContactLinesFor\(primaryOrganization\)/);
  assert.doesNotMatch(
    settings,
    /rounded-full border border-\[#071b42\] px-4 py-2 text-sm font-semibold text-\[#071b42\] transition hover:bg-\[#071b42\] hover:text-white/,
  );

  const copy = readRepo("components/lions-den/follow-up-copy-button.tsx");
  assert.match(copy, /LD_CHIP_SM/);
  assert.doesNotMatch(copy, /border border-\[#071b42\] bg-white/);

  const hub = readRepo("components/lions-den/lions-den-client-hub.tsx");
  assert.match(hub, /rounded-full bg-\[#f5b932\] px-3 py-1\.5 text-xs font-semibold text-\[#071b42\]/);
  assert.match(hub, /\{spanish \? "Cerrar sesión" : "Sign out"\}/);
  assert.match(hub, /\? "bg-\[#f5b932\] text-\[#071b42\]"/);
});

test("control contract does not paint white type onto hover-only navy chips", () => {
  const css = readRepo("app/globals.css");
  assert.doesNotMatch(css, /\[class\*="bg-\[#0"\]/);
  assert.match(css, /\[class\^="bg-\[#0"\]/);
  assert.match(css, /\[class\*=" bg-\[#0"\]/);
  assert.match(css, /never\s+`hover:bg-\*`/);
});

test("gold CTAs and Ask Amanda cream chip stay off the navy chip class", () => {
  const hub = readRepo("components/lions-den/lions-den-client-hub.tsx");
  assert.match(hub, /className="rounded-full bg-\[#f5b932\] px-3 py-1\.5 text-xs font-semibold text-\[#071b42\]/);
  const compose = readRepo("components/lions-den/desk-email-compose.tsx");
  assert.match(compose, /goldChipClass/);
  assert.match(compose, /border-\[#f5b932\] bg-\[#fff8e6\]/);
  assert.match(compose, /chipClass = LD_CHIP_XS/);
});
