import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rule Prod | Measure twice. Buy once.",
  description: "A fictional online store selling every kind of ruler.",
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
      </body>
    </html>
  );
}
