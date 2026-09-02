export const XRPL_ADDRESS = /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/;

export type MintCatalogWork = { sequence?: number; mint_status?: string };

export function mergeMintRegistry<T extends MintCatalogWork & { artifact_id: string; sha256: string }>(
  catalog: T[],
  registry: { works?: Array<{ artifact_id: string; file_sha256?: string; mint_status?: string; xrpl?: unknown }> },
): T[] {
  const live = new Map((registry.works || []).map((work) => [work.artifact_id, work]));
  return catalog.map((work) => {
    const relation = live.get(work.artifact_id);
    if (!relation || relation.file_sha256 !== work.sha256) return work;
    return { ...work, mint_status: relation.mint_status || work.mint_status, xrpl: relation.xrpl } as T;
  });
}

export function actionableMintWorks<T extends MintCatalogWork>(works: T[], claimedUnits: { id: number }[]): T[] {
  return works.filter((work) => work.mint_status === "prepared" && Boolean(work.sequence && claimedUnits[work.sequence - 1]));
}

export function mintAvailability(work: MintCatalogWork, claimedUnits: { id: number }[]): "minted" | "ready" | "awaiting vessel" {
  if (work.mint_status === "minted") return "minted";
  return work.sequence && claimedUnits[work.sequence - 1] ? "ready" : "awaiting vessel";
}

export function textToHex(value: string): string {
  return Array.from(new TextEncoder().encode(value), (byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
}

export function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "untitled-work";
}

export function buildMintTransaction(input: { account: string; id: string; title: string; sha256: string; metadataUri: string; taxon?: number }) {
  return {
    TransactionType: "NFTokenMint",
    Account: input.account,
    NFTokenTaxon: Number.isFinite(input.taxon) ? input.taxon : 0,
    Flags: 0,
    URI: textToHex(input.metadataUri),
    Memos: [{ Memo: {
      MemoType: textToHex("foldforge:ledger-witness"),
      MemoData: textToHex(JSON.stringify({ work_id: input.id, title: input.title, file_sha256: input.sha256, source_authority: "foldportrait-mint-catalog" })),
    } }],
  };
}

export function validateMint(input: { account: string; title: string; description: string; sha256: string; metadataUri: string; visibleUnits: number[] }): string[] {
  const errors: string[] = [];
  if (!XRPL_ADDRESS.test(input.account)) errors.push("Configured witness wallet is invalid");
  if (!input.title.trim()) errors.push("Title is required");
  if (!input.description.trim()) errors.push("Description is required");
  if (!/^[a-f0-9]{64}$/i.test(input.sha256)) errors.push("A SHA-256 source identity is required");
  if (!/^https:\/\//.test(input.metadataUri) && !/^ipfs:\/\//.test(input.metadataUri)) errors.push("A public metadata URI is required");
  if (!input.visibleUnits.length) errors.push("The corresponding SS vessel has not been claimed yet");
  return errors;
}
