import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Composer Chamber — FoldForge",
  description: "A dual-source Ethereum composition derived from zeropoet.eth and rootlogos.eth.",
};

export default function ComposerChamberLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
