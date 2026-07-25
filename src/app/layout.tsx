import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.siscustomcreations.com"),
  title: "SIS Custom Creations | Create. Connect. Celebrate.",
  description:
    "Mobile creative experiences, sign parties, splatter paint parties, DIY kits, custom signs, fundraising projects, and custom apparel by SIS Custom Creations.",
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
