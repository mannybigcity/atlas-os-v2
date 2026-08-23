import "server-only";

import { cookies } from "next/headers";
import {
  normalizeSiteLanguage,
  SITE_LANGUAGE_COOKIE,
  type SiteLanguage,
} from "@/lib/site-language";

export async function getSiteLanguage(
  override?: string | null,
): Promise<SiteLanguage> {
  if (override === "en" || override === "es") {
    return override;
  }

  const cookieStore = await cookies();
  return normalizeSiteLanguage(cookieStore.get(SITE_LANGUAGE_COOKIE)?.value);
}
