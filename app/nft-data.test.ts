import { afterEach, describe, expect, it, vi } from "vitest";
import {
  canonicalMetadataCandidates,
  hydrateCanonicalMedia,
  optimizedImageSrcSet,
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

  it("never lets a provider thumbnail override canonical FoldForge media", () => {
    const nft: AlchemyNft = {
      contract: { address: "0x16bc29ea6e1b9390f70349bfb93ea87ffc9105fc" },
      image: {
        cachedUrl: "https://provider.example/stale-token.png",
        thumbnailUrl: "https://provider.example/stale-thumbnail.png",
        originalUrl: "https://arweave.net/current-contract-image",
      },
    };

    expect(tokenThumbnailFor(nft)).toBe("https://arweave.net/current-contract-image");
  });

  it("never lets a provider thumbnail override canonical Sovereign Standard media", () => {
    const nft: AlchemyNft = {
      contract: { address: "0x716d8251ce9521657b6d36786e6f414e5c915895" },
      image: {
        cachedUrl: "https://provider.example/stale-token.png",
        thumbnailUrl: "https://provider.example/stale-thumbnail.png",
        originalUrl: "https://arweave.net/current-sovereign-image",
      },
    };

    expect(tokenThumbnailFor(nft)).toBe("https://arweave.net/current-sovereign-image");
  });

  it("builds ordered, deduplicated responsive thumbnail candidates", () => {
    const srcSet = optimizedImageSrcSet("ar://image-transaction", [720, 240, 480, 480]);

    expect(srcSet.split(", ")).toHaveLength(3);
    expect(srcSet).toContain("w=240");
    expect(srcSet).toContain("w=480");
    expect(srcSet).toContain("w=720");
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

  it("replaces provider placeholder names with canonical token metadata", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({
      name: "08-the-federalist-papers",
      image: "ar://federalist-image",
    }), { status: 200 }));

    const hydrated = await hydrateCanonicalMedia({
      tokenId: "9",
      name: "#9",
      tokenUri: "https://arweave.net/manifest/1",
    });

    expect(hydrated.name).toBe("08-the-federalist-papers");
    expect(hydrated.image?.originalUrl).toBe("https://arweave.net/federalist-image");
  });

  it("rechecks canonical metadata when only a provider derivative is available", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({
      name: "11-the-thirteen-books-of-euclids-elements",
      image: "ar://euclid-original",
    }), { status: 200 }));

    const hydrated = await hydrateCanonicalMedia({
      tokenId: "12",
      name: "11-the-thirteen-books-of-euclids-elements",
      tokenUri: "ar://euclid-metadata",
      image: { originalUrl: "https://i2c.seadn.io/euclid-derivative.png" },
    }, undefined, true);

    expect(hydrated.image?.originalUrl).toBe("https://arweave.net/euclid-original");
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

  it("treats the exact on-chain tokenURI as primary when provider identity is stale", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({
      name: "09-the-tempest",
      image: "ar://tempest-image",
    }), { status: 200 }));

    const hydrated = await hydrateCanonicalMedia({
      tokenId: "10",
      name: "#10",
      tokenUri: "https://arweave.net/manifest/2",
    }, undefined, true);

    expect(hydrated.name).toBe("09-the-tempest");
    expect(hydrated.image?.originalUrl).toBe("https://arweave.net/tempest-image");
  });
});
