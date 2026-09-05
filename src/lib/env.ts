import { resolvedSampleDeskLoginEmail } from "./client-portal/identity.ts";

export function getSupabaseEnv() {
  const requiredPublicEnv = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };

  const missing = Object.entries(requiredPublicEnv)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `Missing Supabase environment variables: ${missing.join(", ")}. Add them to .env.local.`,
    );
  }

  return {
    supabaseUrl: requiredPublicEnv.NEXT_PUBLIC_SUPABASE_URL as string,
    supabaseAnonKey: requiredPublicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
  };
}

export function getSuperAdminEmails() {
  return (process.env.ATLAS_SUPER_ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function getSupabaseServiceRoleKey() {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!value) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY on the server.");
  }

  return value;
}

export function isSuperAdminEmail(email?: string | null) {
  if (!email) {
    return false;
  }

  return getSuperAdminEmails().includes(email.toLowerCase());
}

function readNetlifyEnv(name: string) {
  const get = (
    globalThis as { Netlify?: { env?: { get?: (key: string) => string | undefined } } }
  ).Netlify?.env?.get;
  if (typeof get !== "function") {
    return "";
  }

  const value = get(name);
  return typeof value === "string" ? value : "";
}

function normalizeRuntimeSecret(value: string) {
  let next = value.replace(/^\uFEFF/, "").trim();
  if (
    next.length >= 2 &&
    ((next.startsWith('"') && next.endsWith('"')) || (next.startsWith("'") && next.endsWith("'")))
  ) {
    next = next.slice(1, -1).trim();
  }
  return next;
}

export function readRuntimeEnv(name: string) {
  // Prefer Netlify.env (runtime) then process.env[name]. Dynamic key access
  // prevents Next from inlining an empty build-time value into server actions.
  // env.ts is also imported by client and edge modules.
  const fromNetlify = normalizeRuntimeSecret(readNetlifyEnv(name));
  if (fromNetlify) {
    return fromNetlify;
  }

  const fromProcess = typeof process !== "undefined" ? process.env[name] : undefined;
  if (typeof fromProcess === "string" && fromProcess.length > 0) {
    return normalizeRuntimeSecret(fromProcess);
  }

  return "";
}

export function getConfiguredDemoLoginEmail() {
  return resolvedSampleDeskLoginEmail(readRuntimeEnv("DEMO_LOGIN_EMAIL"));
}

export function getDemoLoginPassword() {
  return readRuntimeEnv("DEMO_LOGIN_PASSWORD");
}

export function getSiteUrl(fallbackOrigin?: string | null) {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (!configuredUrl && process.env.NODE_ENV === "production") {
    throw new Error(
      "Missing NEXT_PUBLIC_SITE_URL. Configure the exact HTTPS production origin.",
    );
  }

  const rawUrl = configuredUrl || fallbackOrigin || "http://localhost:3000";
  const url = new URL(rawUrl);

  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_SITE_URL must use HTTPS in production.");
  }

  return url.origin;
}
