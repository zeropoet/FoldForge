import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { localCollections, localTokens, preferLocalCollections, preferLocalToken, preferLocalTokens } from "./local-ethereum-archive";
import type { AlchemyNft, CollectionSummary } from "./nft-data";

const address = "0x16bc29ea6e1b9390f70349bfb93ea87ffc9105fc";

function token(tokenId: string, image: string, name = tokenId): AlchemyNft {
  return { tokenId, name, contract: { address }, image: { originalUrl: image } };
}

describe("local Ethereum archive precedence", () => {
  it("keeps locally archived tokenURI media when a wallet provider returns stale media", () => {
    const result = preferLocalTokens(
      [token("40", "https://provider.invalid/stale.png", "Stale title")],
      [token("40", `/ethereum-archive/contracts/${address}/tokens/40/image.png`, "Frankenstein")],
    );
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Frankenstein");
    expect(result[0].image?.originalUrl).toContain("/tokens/40/image.png");
  });

  it("does not reintroduce provider-only records into a contract-backed collection", () => {
    const result = preferLocalTokens(
      [token("51", "remote-51"), token("52", "stale-provider-placeholder")],
      [token("51", "/ethereum-archive/tokens/51/image.png")],
    );
    expect(result.map((entry) => entry.tokenId)).toEqual(["51"]);
  });

  it("retains numeric FLDFRG mints as records without presenting them as named works", () => {
    const archive = {
      schema: "foldforge-ethereum-archive/v2" as const,
      contracts: [{ address, name: "FOLD FORGE", symbol: "FLDFRG", description: "", total_supply: "55", image: "", token_ids: ["51", "52"] }],
      tokens: [
        { contract: address, token_id: "51", token_uri: "", name: "51-ethereum", description: "", token_type: "ERC721", attributes: [], media: null, animation: null },
        { contract: address, token_id: "52", token_uri: "", name: "52", description: "", token_type: "ERC721", attributes: [], media: null, animation: null },
      ],
    };
    expect(localTokens(archive)).toHaveLength(1);
    expect(localCollections(archive)[0].count).toBe(1);
  });

  it("keeps the FLDFRG gallery index synchronized with every canonical token record", () => {
    const archive = JSON.parse(readFileSync(resolve("public/ethereum-archive/index.json"), "utf8"));
    const indexed = archive.tokens.filter((entry: { contract: string }) => entry.contract === address);
    expect(indexed).toHaveLength(55);
    for (const entry of indexed) {
      const record = JSON.parse(readFileSync(resolve(`public/ethereum-archive/contracts/${address}/tokens/${entry.token_id}/metadata.json`), "utf8"));
      expect(entry.name, `token ${entry.token_id}`).toBe(record.name);
      expect(entry.token_uri, `token ${entry.token_id}`).toBe(record.token_uri);
      expect(entry.media?.sha256, `token ${entry.token_id}`).toBe(record.media?.sha256);
    }
  });

  it("keeps every observed contract and mint complete in the local archive", () => {
    const archive = JSON.parse(readFileSync(resolve("public/ethereum-archive/index.json"), "utf8"));
    expect(archive.tokens).toHaveLength(archive.work_count);
    expect(archive.contracts).toHaveLength(archive.contract_count);
    for (const contract of archive.contracts) {
      const manifestPath = resolve(`public/ethereum-archive/contracts/${contract.address}/contract.json`);
      expect(existsSync(manifestPath), `${contract.address} contract manifest`).toBe(true);
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
      const indexedIds = archive.tokens
        .filter((entry: { contract: string }) => entry.contract === contract.address)
        .map((entry: { token_id: string }) => String(entry.token_id))
        .sort((left: string, right: string) => left.localeCompare(right, undefined, { numeric: true }));
      expect([...manifest.token_ids].map(String).sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))).toEqual(indexedIds);
    }
    for (const entry of archive.tokens) {
      const tokenRoot = resolve(`public/ethereum-archive/contracts/${entry.contract}/tokens/${entry.token_id}`);
      expect(existsSync(resolve(tokenRoot, "metadata.json")), `${entry.contract}:${entry.token_id} metadata`).toBe(true);
      if (entry.media?.file) expect(existsSync(resolve(tokenRoot, entry.media.file)), `${entry.contract}:${entry.token_id} media`).toBe(true);
      if (entry.animation?.file) expect(existsSync(resolve(tokenRoot, entry.animation.file)), `${entry.contract}:${entry.token_id} animation`).toBe(true);
    }
  });

  it("versions archived media URLs from their content witness", () => {
    const archive = {
      schema: "foldforge-ethereum-archive/v2" as const,
      contracts: [],
      tokens: [{
        contract: address,
        token_id: "2",
        token_uri: "",
        name: "Original Douay-Rheims Catholic Canon",
        description: "",
        token_type: "ERC721",
        attributes: [],
        media: { path: "/ethereum-archive/tokens/2/image.png", media_type: "image/png", sha256: "63f4bf57ccd1335e31e05b8225799cc0" },
        animation: null,
      }],
    };
    expect(localTokens(archive)[0].image?.originalUrl).toBe("/ethereum-archive/tokens/2/image.png?v=63f4bf57ccd1335e");
  });

  it("keeps MORANTHUL visible locally while retaining its canonical video", () => {
    const archive = JSON.parse(readFileSync(resolve("public/ethereum-archive/index.json"), "utf8"));
    const moranthul = localTokens(archive, "0x97a8c9e0fe03749fdbd1fcd018577a1ba61b7b65")
      .find((entry) => entry.tokenId === "8");
    expect(moranthul?.name).toBe("MORANTHUL ◦");
    expect(moranthul?.image?.originalUrl).toContain("/tokens/8/poster.png");
    expect(moranthul?.animation?.originalUrl).toBe("https://gateway.pinata.cloud/ipfs/Qmcdq2HNJiiNMhvro8jTYBSJYhRLB917xCWDppb5kWsUSA/nft.mp4");
  });

  it("uses the local record on individual work pages", () => {
    const archived = token("21", "/ethereum-archive/tokens/21/image.png", "Tao Te Ching");
    expect(preferLocalToken(token("21", "https://provider.invalid/21.png"), archived)).toBe(archived);
  });

  it("retains the local collection image while preserving the live holding count", () => {
    const live: CollectionSummary = { address, name: "Provider", symbol: "FLDFRG", count: 54, image: "remote", description: "", totalSupply: "55", floorPrice: null };
    const local: CollectionSummary = { ...live, name: "FOLD FORGE", count: 55, image: "/ethereum-archive/local.png" };
    expect(preferLocalCollections([live], [local])[0]).toMatchObject({ name: "FOLD FORGE", image: "/ethereum-archive/local.png", count: 54 });
  });
});
