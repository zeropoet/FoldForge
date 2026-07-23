import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://foldforge.xyz"),
  title: "FoldForge — Ethereum Archive",
  description: "An archival index of Ethereum NFT collections and minted works.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "FoldForge — Ethereum Archive",
    description: "An archival index of Ethereum NFT collections and minted works.",
    url: "https://foldforge.xyz",
    siteName: "FoldForge",
    images: [{ url: "/foldforge-social.png", width: 1200, height: 630, alt: "FoldForge Ethereum Archive" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FoldForge — Ethereum Archive",
    description: "An archival index of Ethereum NFT collections and minted works.",
    images: ["/foldforge-social.png"],
  },
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
