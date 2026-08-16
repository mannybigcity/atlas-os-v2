import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://atlasforentrepreneurs.com"),
  title: "Atlas For Entrepreneurs | Service Business Growth OS",
  description:
    "A practical growth operating system for owner-led service businesses. Organize leads, follow-up, marketing, and the next priority in one private workspace.",
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
        <Suspense fallback={null}>
          <SiteFooter />
        </Suspense>
      </body>
    </html>
  );
}
