import type { Metadata } from "next";
import { AtlasHomepage } from "@/components/atlas-homepage";
import { getAtlasSprintPaymentLink } from "@/lib/payment-links";

export const metadata: Metadata = {
  title: "Atlas For Entrepreneurs | Find More Leads, Follow Up Faster, Close More Deals",
  description:
    "Atlas helps contractors and small business owners keep leads, follow-up, and open jobs organized so nothing slips through the cracks.",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Atlas For Entrepreneurs",
    description: "Find more leads, follow up faster, and close more deals.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Atlas For Entrepreneurs",
    description: "Find more leads, follow up faster, and close more deals.",
  },
};

export default function Home() {
  return <AtlasHomepage paymentLink={getAtlasSprintPaymentLink()} />;
}
