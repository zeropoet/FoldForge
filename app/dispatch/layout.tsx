import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dispatch — FoldForge",
  description: "A private local chamber for validating and printing Sovereign Standard fulfillment labels.",
};

export default function DispatchLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
