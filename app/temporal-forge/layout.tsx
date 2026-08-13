import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Temporal Forge — FoldForge",
  description: "A private FoldForge chamber for sequencing collection frames and observing recurrence through visual time.",
};

export default function TemporalForgeLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
