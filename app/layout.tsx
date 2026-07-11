import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FoldForge",
  description: "A wallet-connected NFT collection gallery.",
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
