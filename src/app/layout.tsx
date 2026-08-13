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
  metadataBase: new URL("https://app.ramfamatlas.com"),
  title: "RamFam Atlas OS | Private Operating System",
  description:
    "RamFam Atlas OS is the private operating system for your family businesses.",
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
