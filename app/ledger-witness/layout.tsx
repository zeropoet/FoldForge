import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ledger Witness — FoldForge",
  description: "A steward-operated FoldForge instrument for preparing, signing, and verifying XRPL mint provenance.",
  robots: { index: false, follow: false },
};

export default function LedgerWitnessLayout({ children }: Readonly<{ children: React.ReactNode }>) { return children; }
