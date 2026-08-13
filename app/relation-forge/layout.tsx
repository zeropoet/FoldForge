import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Relation Forge — FoldForge",
  description: "A private image-to-language instrument for composing witnessed relations.",
};

export default function RelationForgeLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
