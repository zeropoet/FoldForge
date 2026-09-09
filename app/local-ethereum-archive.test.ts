import { describe, expect, it } from "vitest";
import { preferLocalCollections, preferLocalToken, preferLocalTokens } from "./local-ethereum-archive";
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
