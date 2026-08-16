import type { Metadata } from "next";
import { AtlasHomepage } from "@/components/atlas-homepage";
import { normalizeSiteLanguage } from "@/lib/site-language";

export const metadata: Metadata = {
  title: "Atlas for Service Businesses | Lead Follow-Up & Growth OS",
  description:
    "Atlas helps owner-led service businesses organize leads, follow up on opportunities, keep marketing moving, and focus on the next growth priority.",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Atlas | The Growth OS for Owner-Led Service Businesses",
    description:
      "Stop losing customers between the first call and the follow-up. Start with a free service-business growth assessment.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Atlas | The Growth OS for Owner-Led Service Businesses",
    description:
      "Leads, follow-up, practical marketing, and one clear growth priority for owner-led service businesses.",
  },
};

export default async function Home({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const params = await searchParams;
  return <AtlasHomepage initialLanguage={normalizeSiteLanguage(params.lang)} />;
}
