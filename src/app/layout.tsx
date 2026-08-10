import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import { RouteFooter } from "@/components/route-footer";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://atlasforentrepreneurs.com"),
  title: "Atlas For Entrepreneurs | Find More Leads, Follow Up Faster, Close More Deals",
  description:
    "Atlas helps entrepreneurs find customers, keep opportunity context attached, follow up faster, and move more deals forward in one private workflow.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className={`${manrope.variable} ${fraunces.variable}`} lang="en">
      <body>
        {children}
        <RouteFooter />
      </body>
    </html>
  );
}
