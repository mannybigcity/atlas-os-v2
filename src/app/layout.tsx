import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Atlas For Entrepreneurs | Practical Business Growth Support",
  description:
    "A human-guided 30-day business pilot that turns one important goal into clear priorities, reviewed work, and practical next actions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
