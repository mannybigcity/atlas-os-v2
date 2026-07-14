import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Atlas OS",
  description:
    "A private founder operating system for organizing businesses, projects, client work, and new ideas.",
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
