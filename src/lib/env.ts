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

export function isSuperAdminEmail(email?: string | null) {
  if (!email) {
    return false;
  }

  return getSuperAdminEmails().includes(email.toLowerCase());
}
