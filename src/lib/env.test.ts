import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  FOUNDER_MAILBOX_EMAIL,
  SAMPLE_DESK_LOGIN_EMAIL,
  isForbiddenSampleDeskLoginEmail,
} from "./client-portal/identity.ts";
import {
  getConfiguredDemoLoginEmail,
  getDemoLoginPassword,
  readRuntimeEnv,
} from "./env.ts";

const envSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "env.ts"), "utf8");

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

test("demo login secrets are read at runtime, not via static process.env.NAME", () => {
  assert.match(envSource, /process\.env\[name\]/);
  assert.match(envSource, /Netlify\?\.env\?\.get/);
  assert.doesNotMatch(envSource, /process\.env\.DEMO_LOGIN_PASSWORD/);
  assert.doesNotMatch(envSource, /process\.env\.DEMO_LOGIN_EMAIL/);
});

test("readRuntimeEnv keeps # and & and strips wrapped quotes", () => {
  withEnv("DEMO_LOGIN_PASSWORD", undefined, () => {
    withEnv("DEMO_LOGIN_PASSWORD", "  'plain#secret&ok'  ", () => {
      assert.equal(readRuntimeEnv("DEMO_LOGIN_PASSWORD"), "plain#secret&ok");
      assert.equal(getDemoLoginPassword(), "plain#secret&ok");
    });
  });
});

test("readRuntimeEnv prefers Netlify.env over an empty or missing process.env value", () => {
  withEnv("DEMO_LOGIN_PASSWORD", "", () => {
    withNetlifyEnv({ DEMO_LOGIN_PASSWORD: "netlify-runtime-secret" }, () => {
      assert.equal(getDemoLoginPassword(), "netlify-runtime-secret");
    });
  });
});

test("configured demo email falls back to the plus-address and never the founder mailbox", () => {
  withEnv("DEMO_LOGIN_EMAIL", FOUNDER_MAILBOX_EMAIL, () => {
    assert.equal(getConfiguredDemoLoginEmail(), SAMPLE_DESK_LOGIN_EMAIL);
    assert.equal(isForbiddenSampleDeskLoginEmail(getConfiguredDemoLoginEmail()), false);
  });
  withEnv("DEMO_LOGIN_EMAIL", "info@atlasforentrepreneurs.com", () => {
    assert.equal(getConfiguredDemoLoginEmail(), SAMPLE_DESK_LOGIN_EMAIL);
  });
  withEnv("DEMO_LOGIN_EMAIL", "atlasforentrepreneurs+demo@gmail.com", () => {
    assert.equal(getConfiguredDemoLoginEmail(), SAMPLE_DESK_LOGIN_EMAIL);
  });
  withEnv("DEMO_LOGIN_EMAIL", "desk+sample@example.invalid", () => {
    assert.equal(getConfiguredDemoLoginEmail(), "desk+sample@example.invalid");
    assert.equal(isForbiddenSampleDeskLoginEmail(getConfiguredDemoLoginEmail()), false);
  });
});

test("missing demo password is an empty string so Show the desk can report unavailable", () => {
  withEnv("DEMO_LOGIN_PASSWORD", undefined, () => {
    withNetlifyEnv({}, () => {
      assert.equal(getDemoLoginPassword(), "");
    });
  });
});
