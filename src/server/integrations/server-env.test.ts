import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { requireServerIntegrationSecret } from "./server-env.ts";

const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "server-env.ts"), "utf8");

type NetlifyGlobal = { Netlify?: { env?: { get?: (key: string) => string | undefined } } };

function withEnv(name: string, value: string | undefined, run: () => void) {
  const previous = process.env[name];
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
  try {
    run();
  } finally {
    if (previous === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = previous;
    }
  }
}

function withNetlifyEnv(values: Record<string, string>, run: () => void) {
  const globalRef = globalThis as NetlifyGlobal;
  const previous = globalRef.Netlify;
  globalRef.Netlify = {
    env: {
      get(key: string) {
        return values[key];
      },
    },
  };
  try {
    run();
  } finally {
    if (previous === undefined) {
      delete globalRef.Netlify;
    } else {
      globalRef.Netlify = previous;
    }
  }
}

test("Places key is read at runtime via readRuntimeEnv, not inlined process.env.GOOGLE_PLACES_API_KEY", () => {
  assert.match(source, /readRuntimeEnv\(name\)/);
  assert.doesNotMatch(source, /process\.env\.GOOGLE_PLACES_API_KEY/);
  assert.doesNotMatch(source, /from "node:process"/);
});

test("quoted Netlify GOOGLE_PLACES_API_KEY is stripped before Google sees it", () => {
  withEnv("GOOGLE_PLACES_API_KEY", undefined, () => {
    withNetlifyEnv({ GOOGLE_PLACES_API_KEY: '"AIza-test-places-key"' }, () => {
      assert.equal(requireServerIntegrationSecret("GOOGLE_PLACES_API_KEY"), "AIza-test-places-key");
    });
  });
});
