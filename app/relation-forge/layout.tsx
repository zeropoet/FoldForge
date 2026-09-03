import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Relation Forge — FoldForge",
  description: "Sovereign Standard's private image-to-language boundary for preparing human-published Instagram posts.",
};

export default function RelationForgeLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
