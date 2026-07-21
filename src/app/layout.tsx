import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.siscustomcreations.com"),
  title: "SIS Custom Creations | Creative Commerce Studio",
  description:
    "Premium custom apparel, creative experiences, DIY kits, and SIS AI design tools for families, teams, schools, and businesses.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
