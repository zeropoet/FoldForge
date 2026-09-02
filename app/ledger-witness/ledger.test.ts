import { describe, expect, it } from "vitest";
import { actionableMintWorks, buildMintTransaction, mergeMintRegistry, mintAvailability, slugify, textToHex, validateMint } from "./ledger";

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

  it("admits only the next prepared portrait whose claim-order vessel exists", () => {
    const works = Array.from({ length: 108 }, (_, offset) => ({
      sequence: offset + 1,
      mint_status: offset < 14 ? "minted" : "prepared",
    }));
    const claimedUnits = Array.from({ length: 15 }, (_, id) => ({ id }));
    expect(actionableMintWorks(works, claimedUnits).map((work) => work.sequence)).toEqual([15]);
    expect(mintAvailability(works[14], claimedUnits)).toBe("ready");
    expect(mintAvailability(works[15], claimedUnits)).toBe("awaiting vessel");
  });

  it("removes a live minted work immediately without exposing the next vesselless work", () => {
    const works = [15, 16].map((sequence) => ({
      sequence, artifact_id: `foldportrait-${sequence}`, sha256: String(sequence).padStart(64, "0"), mint_status: "prepared",
    }));
    const live = { works: [{
      artifact_id: "foldportrait-15", file_sha256: String(15).padStart(64, "0"), mint_status: "minted", xrpl: { validated: true },
    }] };
    const merged = mergeMintRegistry(works, live);
    expect(merged[0].mint_status).toBe("minted");
    expect(actionableMintWorks(merged, Array.from({ length: 15 }, (_, id) => ({ id })))).toEqual([]);
  });
});
