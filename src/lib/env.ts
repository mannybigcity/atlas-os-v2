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
