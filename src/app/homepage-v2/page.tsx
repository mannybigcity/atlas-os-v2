import type { Metadata } from "next";
import { AtlasHomepage } from "@/components/atlas-homepage";

export const metadata: Metadata = {
  title: "Homepage Preview | Atlas For Entrepreneurs",
  description: "A review route for the current Atlas public homepage.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function HomepagePreview() {
  return <AtlasHomepage preview />;
}
