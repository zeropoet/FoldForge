import { afterEach, describe, expect, it, vi } from "vitest";
import {
  canonicalMetadataCandidates,
  hydrateCanonicalMedia,
  tokenThumbnailFor,
  type AlchemyNft,
} from "./nft-data";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("canonical NFT media", () => {
  it("uses raw provider metadata when processed image fields are still empty", () => {
    const nft: AlchemyNft = {
      image: { cachedUrl: "", originalUrl: "" },
      raw: { metadata: { image: "ar://image-transaction" } },
    };

    expect(tokenThumbnailFor(nft)).toBe("https://arweave.net/image-transaction");
  });

  it("adds validated recovery routes for numeric Arweave metadata paths", () => {
    expect(canonicalMetadataCandidates("https://arweave.net/manifest/1")).toEqual([
      "https://arweave.net/manifest/1",
      "https://arweave.net/manifest/1.json",
    ]);
  });

  it("recovers a matching token image from an alternate metadata route", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        name: "RWL-44",
        image: "ar://rwl-44-image",
      }), { status: 200 }));

    const hydrated = await hydrateCanonicalMedia({
      name: "RWL-44",
      tokenUri: "https://arweave.net/manifest/1",
    });

    expect(hydrated.image?.originalUrl).toBe("https://arweave.net/rwl-44-image");
  });

  it("never assigns alternate metadata belonging to another token", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        name: "RWL-44",
        image: "ar://rwl-44-image",
      }), { status: 200 }));

    const nft: AlchemyNft = {
      name: "RWL-45",
      tokenUri: "https://arweave.net/manifest/2",
    };
    const hydrated = await hydrateCanonicalMedia(nft);

    expect(hydrated).toEqual(nft);
  });
});
