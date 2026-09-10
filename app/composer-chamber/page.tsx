import archive from "../../public/ethereum-archive/index.json";
import PublicHeader from "../public-header";
import DualSourceComposer, { type ComposerSource } from "./dual-source-composer";

type ArchiveToken = {
  contract: string;
  token_id: string;
  name: string;
  evidence_sha256: string;
  holding_state?: string;
  owners?: string[];
};

export default function ComposerChamberPage() {
  const tokens = archive.tokens as ArchiveToken[];
  const sources: ComposerSource[] = archive.owners.map((owner) => ({
    name: owner.name,
    contractCount: owner.contract_count,
    workCount: owner.work_count,
    observedWorkCount: owner.observed_work_count,
    witness: owner.witness,
    tokens: tokens
      .filter((token) => token.holding_state === "current" && token.owners?.includes(owner.name))
      .map((token) => ({ key: `${token.contract}:${token.token_id}`, name: token.name, evidence: token.evidence_sha256 })),
  }));

  return (
    <main className="archive-shell min-h-screen bg-white text-black">
      <PublicHeader active="archive" />
      <div className="mx-auto w-full max-w-[1600px] px-5 py-10 md:px-8 md:py-16">
        <header className="grid gap-9 pb-12 md:grid-cols-[1fr_auto] md:items-end md:pb-16">
          <div>
            <p className="text-[9px] uppercase tracking-[0.26em] text-black/40">Composer chamber / Ethereum mainnet</p>
            <h1 className="mt-5 max-w-4xl text-5xl font-light tracking-[-0.06em] md:text-8xl">Two holdings.<br />One audible relation.</h1>
            <p className="mt-7 max-w-2xl text-sm leading-7 text-black/55">Two independently held Ethereum states enter together. FoldForge sums their evidence-derived voices into one centered composite without merging ownership, provenance, or archive authority.</p>
            <p className="mt-5 font-mono text-[8px] uppercase tracking-[0.16em] text-black/30">{archive.work_count} archived works / {archive.owners.reduce((total, owner) => total + owner.observed_work_count, 0)} currently observed</p>
          </div>
          <a className="text-[9px] uppercase tracking-[0.2em] text-black/45 hover:text-black" href="/">Return to collections →</a>
        </header>
        <DualSourceComposer sources={sources} />
        <footer className="flex flex-wrap items-center justify-between gap-4 py-7 font-mono text-[7px] uppercase tracking-[0.14em] text-black/25">
          <span>Canonical composite / archived by The Record</span><span>Sources remain independently witnessed</span>
        </footer>
      </div>
    </main>
  );
}
