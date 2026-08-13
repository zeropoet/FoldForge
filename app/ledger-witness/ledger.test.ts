import { describe, expect, it } from "vitest";
import { buildMintTransaction, slugify, textToHex, validateMint } from "./ledger";

describe("Ledger Witness mint grammar", () => {
  it("builds deterministic XRPL hex fields", () => {
    expect(textToHex("A")).toBe("41");
    const tx = buildMintTransaction({ account: "rfYiNfgLefTAZGfEyun1EjG68mTtC75vDe", id: "work-1", title: "Work 1", sha256: "a".repeat(64), metadataUri: "ipfs://work", taxon: 7 });
    expect(tx.TransactionType).toBe("NFTokenMint");
    expect(tx.NFTokenTaxon).toBe(7);
    expect(tx.URI).toBe(textToHex("ipfs://work"));
  });

  it("normalizes work identifiers and rejects incomplete drafts", () => {
    expect(slugify(" A Work / One ")).toBe("a-work-one");
    expect(validateMint({ account: "bad", title: "", description: "", sha256: "", metadataUri: "", visibleUnits: [] })).toHaveLength(6);
  });
});
