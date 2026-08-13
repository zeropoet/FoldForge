import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sonic Forge — FoldForge",
  description: "FoldForge's private, deterministic audio displacement and mastering instrument.",
  openGraph: {
    title: "Sonic Forge — FoldForge",
    description: "A source-responsive audio displacement path producing a witnessed lossless master.",
    images: [{ url: "/foldforge-social.png", width: 1200, height: 630, alt: "Sonic Forge by FoldForge" }],
  },
};

export default function SonicForgeLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
