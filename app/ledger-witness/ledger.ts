export const XRPL_ADDRESS = /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/;

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
      MemoData: textToHex(JSON.stringify({ work_id: input.id, title: input.title, file_sha256: input.sha256, source_authority: "sovereign-standard-public-archive" })),
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
