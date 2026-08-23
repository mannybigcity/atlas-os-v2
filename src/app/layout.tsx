import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Fraunces, Manrope } from "next/font/google";
import { RouteFooter } from "@/components/route-footer";
import { normalizeSiteLanguage, SITE_LANGUAGE_COOKIE } from "@/lib/site-language";
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
  title: "Atlas For Entrepreneurs | Client Workspace",
  description:
    "Atlas For Entrepreneurs gives business owners a secure workspace to follow up, manage clients, and move work forward.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const language = normalizeSiteLanguage(cookieStore.get(SITE_LANGUAGE_COOKIE)?.value);

  return (
    <html className={`${manrope.variable} ${fraunces.variable}`} lang={language}>
      <body>
        {children}
        <RouteFooter initialLanguage={language} />
      </body>
    </html>
  );
}
