import Link from "next/link";

type Surface = "archive" | "sonic" | "temporal" | "relation" | "ledger" | "dispatch";

const surfaces: Array<{ id: Surface; label: string; href: string }> = [
  { id: "archive", label: "Archive", href: "/" },
  { id: "sonic", label: "Sonic", href: "/sonic-forge" },
  { id: "temporal", label: "Temporal", href: "/temporal-forge" },
  { id: "relation", label: "Relation", href: "/relation-forge" },
  { id: "ledger", label: "Ledger", href: "/ledger-witness" },
  { id: "dispatch", label: "Dispatch", href: "/dispatch" },
];

export default function PublicHeader({ active }: { active: Surface }) {
  return (
    <header className="site-header sticky top-0 z-20 border-b border-black/20 px-5 py-3 md:px-8">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 sm:flex-nowrap sm:gap-5">
        <Link className="flex items-center gap-3" href="/">
          <span aria-hidden="true" className="brand-mark">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="" src="/brand/foldforge-mark.svg" />
          </span>
          <span className="block text-[10px] uppercase tracking-[0.26em]">FoldForge</span>
        </Link>
        <nav aria-label="FoldForge instruments" className="flex w-full items-center justify-between gap-3 overflow-x-auto border-t border-black/10 pt-3 text-[8px] uppercase tracking-[0.16em] sm:w-auto sm:gap-5 sm:border-0 sm:pt-0 sm:text-[9px] sm:tracking-[0.2em]">
          {surfaces.map((surface) => surface.id === active
            ? <span aria-current="page" key={surface.id}>{surface.label}</span>
            : <Link className="text-black/40 hover:text-black" href={surface.href} key={surface.id}>{surface.label}</Link>)}
        </nav>
      </div>
    </header>
  );
}
