import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "Atlas For Entrepreneurs | Your AI-Powered Business Team",
  description:
    "Start with a free business assessment and build a focused plan for leads, content, follow-up, and execution with ATLAS.",
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
