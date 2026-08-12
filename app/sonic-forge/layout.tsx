import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sonic Forge — FoldForge",
  description: "A private-by-default FoldForge chamber for clarifying, displacing, synthesizing, witnessing, and mastering sound.",
  openGraph: {
    title: "Sonic Forge — FoldForge",
    description: "Sound enters as evidence and leaves as a witnessed displaced master.",
    images: [{ url: "/foldforge-social.png", width: 1200, height: 630, alt: "Sonic Forge by FoldForge" }],
  },
};

export default function SonicForgeLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
