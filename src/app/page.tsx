import type { Metadata } from "next";
import { CustomPrintPage } from "@/components/custom-print-page";

export const metadata: Metadata = {
  title: "SIS Custom Creations | Creative Commerce Studio",
  description:
    "Premium custom apparel, creative experiences, DIY kits, and SIS AI design tools for families, teams, schools, and businesses.",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "SIS Custom Creations | Creative Commerce Studio",
    description:
      "Custom apparel, AI-assisted design, DIY kits, and creative experiences presented with a premium family-centered brand.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "SIS Custom Creations | Creative Commerce Studio",
    description:
      "Choose a garment, upload artwork, or start with SIS AI to order premium custom apparel and creative experiences.",
  },
};

export default function Home() {
  return <CustomPrintPage />;
}
