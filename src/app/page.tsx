import type { Metadata } from "next";
import { AtlasHomepage } from "@/components/atlas-homepage";

export const metadata: Metadata = {
  title: "Atlas For Entrepreneurs | Practical AI Help for Service Businesses",
  description:
    "Atlas helps owner-led service businesses organize leads, prepare follow-up, create practical marketing, and move the right work forward without needing to become AI experts.",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Atlas For Entrepreneurs",
    description:
      "Practical AI help for owner-led service businesses, starting with a free business assessment.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Atlas For Entrepreneurs",
    description:
      "Practical AI help for owner-led service businesses, starting with a free business assessment.",
  },
};

export default function Home() {
  return <AtlasHomepage />;
}
