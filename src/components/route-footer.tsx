import { SiteFooter } from "@/components/site-footer";
import type { SiteLanguage } from "@/lib/site-language";

export function RouteFooter({ initialLanguage = "en" }: { initialLanguage?: SiteLanguage }) {
  return <SiteFooter initialLanguage={initialLanguage} />;
}
