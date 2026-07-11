export interface AlchemyNft {
  tokenId?: string;
  name?: string;
  description?: string;
  tokenType?: string;
  tokenUri?: string;
  contract?: {
    address?: string;
    name?: string;
    symbol?: string;
    totalSupply?: string;
    tokenType?: string;
    openSeaMetadata?: {
      collectionName?: string;
      description?: string;
      imageUrl?: string;
      floorPrice?: number;
      externalUrl?: string;
    };
  };
  image?: {
    cachedUrl?: string;
    thumbnailUrl?: string;
    pngUrl?: string;
    originalUrl?: string;
  };
  collection?: {
    name?: string;
  };
  animation?: {
    cachedUrl?: string | null;
    originalUrl?: string | null;
  };
  raw?: {
    metadata?: {
      attributes?: Array<{ trait_type?: string; value?: string | number }>;
    };
  };
}

export interface AlchemyTokenListing {
  contractAddress?: string;
  tokenId?: string;
  balance?: string;
}

export interface AlchemyContract {
  address?: string;
  name?: string | null;
  symbol?: string | null;
  totalSupply?: string | null;
  tokenType?: string | null;
  totalBalance?: string;
  numDistinctTokensOwned?: string;
  openSeaMetadata?: {
    collectionName?: string | null;
    description?: string | null;
    imageUrl?: string | null;
    floorPrice?: number | null;
    externalUrl?: string | null;
    bannerImageUrl?: string | null;
  };
  image?: {
    cachedUrl?: string | null;
    thumbnailUrl?: string | null;
    pngUrl?: string | null;
    originalUrl?: string | null;
  };
  displayNft?: {
    tokenId?: string;
    name?: string;
  };
  isSpam?: boolean;
}

export interface CollectionSummary {
  address: string;
  name: string;
  symbol: string;
  count: number;
  image: string;
  description: string;
  totalSupply: string;
  floorPrice: number | null;
}

export interface TokenSummary {
  id: string;
  name: string;
  image: string;
  description: string;
  tokenType: string;
}

export const addressPattern = /^0x[a-fA-F0-9]{40}$/;

export const supportedNetworks = new Map([
  ["eth-mainnet", "Ethereum"],
  ["base-mainnet", "Base"],
  ["polygon-mainnet", "Polygon"],
  ["arb-mainnet", "Arbitrum"],
]);

export function networkLabel(network: string): string {
  return supportedNetworks.get(network) || supportedNetworks.get("eth-mainnet") || "Ethereum";
}

export function fallbackGradient(address: string): string {
  const tone = 8 + (Number.parseInt(address.slice(2, 8), 16) % 12);
  return `linear-gradient(135deg, hsl(0 0% ${tone + 7}%), hsl(0 0% ${tone}%))`;
}

export function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov)(?:$|\?)/i.test(url);
}

export function normalizeNetwork(network: string | null | undefined): string {
  return network && supportedNetworks.has(network) ? network : "eth-mainnet";
}

export function imageFor(nft: AlchemyNft): string {
  return (
    nft.contract?.openSeaMetadata?.imageUrl ||
    nft.image?.cachedUrl ||
    nft.image?.thumbnailUrl ||
    nft.image?.pngUrl ||
    nft.image?.originalUrl ||
    ""
  );
}

export function tokenImageFor(nft: AlchemyNft): string {
  return (
    nft.image?.cachedUrl ||
    nft.image?.thumbnailUrl ||
    nft.image?.pngUrl ||
    nft.image?.originalUrl ||
    nft.animation?.cachedUrl ||
    nft.animation?.originalUrl ||
    nft.contract?.openSeaMetadata?.imageUrl ||
    ""
  );
}

function contractImageFor(contract: AlchemyContract): string {
  return (
    contract.openSeaMetadata?.imageUrl ||
    contract.image?.cachedUrl ||
    contract.image?.thumbnailUrl ||
    contract.image?.pngUrl ||
    contract.image?.originalUrl ||
    ""
  );
}

function contractNameFor(contract: AlchemyContract, address: string): string {
  return (
    contract.openSeaMetadata?.collectionName ||
    contract.name ||
    `Collection ${address.slice(2, 8).toUpperCase()}`
  );
}

export function nameFor(nft: AlchemyNft, address: string): string {
  return (
    nft.contract?.openSeaMetadata?.collectionName ||
    nft.collection?.name ||
    nft.contract?.name ||
    `Collection ${address.slice(2, 8).toUpperCase()}`
  );
}

export function summarizeContracts(contracts: AlchemyContract[]): CollectionSummary[] {
  return contracts
    .map((contract) => {
      const address = contract.address?.toLowerCase() || "";

      return {
        address,
        name: contractNameFor(contract, address),
        symbol: contract.symbol || "",
        count: Number(contract.numDistinctTokensOwned || contract.totalBalance || 0),
        image: contractImageFor(contract),
        description: contract.openSeaMetadata?.description || "",
        totalSupply: contract.totalSupply || "",
        floorPrice: contract.openSeaMetadata?.floorPrice ?? null,
      };
    })
    .filter((collection) => collection.address)
    .sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }

      return a.name.localeCompare(b.name);
    });
}

export function summarizeContract(contract: AlchemyContract): CollectionSummary {
  const address = contract.address?.toLowerCase() || "";

  return {
    address,
    name: contractNameFor(contract, address),
    symbol: contract.symbol || "",
    count: 0,
    image: contractImageFor(contract),
    description: contract.openSeaMetadata?.description || "",
    totalSupply: contract.totalSupply || "",
    floorPrice: contract.openSeaMetadata?.floorPrice ?? null,
  };
}

export function summarizeCollections(nfts: AlchemyNft[]): CollectionSummary[] {
  const grouped = new Map<string, CollectionSummary>();

  for (const nft of nfts) {
    const address = nft.contract?.address?.toLowerCase();
    if (!address) {
      continue;
    }

    const current = grouped.get(address);
    if (current) {
      current.count += 1;
      if (!current.image) {
        current.image = imageFor(nft);
      }
      continue;
    }

    grouped.set(address, {
      address,
      name: nameFor(nft, address),
      symbol: nft.contract?.symbol || "",
      count: 1,
      image: imageFor(nft),
      description: nft.contract?.openSeaMetadata?.description || "",
      totalSupply: nft.contract?.totalSupply || "",
      floorPrice: nft.contract?.openSeaMetadata?.floorPrice ?? null,
    });
  }

  return [...grouped.values()].sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count;
    }

    return a.name.localeCompare(b.name);
  });
}

export function summarizeTokens(nfts: AlchemyNft[]): TokenSummary[] {
  return nfts.map((nft, index) => ({
    id: nft.tokenId || String(index + 1),
    name: nft.name || `Token ${nft.tokenId || index + 1}`,
    image: tokenImageFor(nft),
    description: nft.description || "",
    tokenType: nft.tokenType || nft.contract?.tokenType || "NFT",
  }));
}

export function summarizeTokenListings(tokens: AlchemyTokenListing[]): TokenSummary[] {
  return tokens.map((token, index) => ({
    id: token.tokenId || String(index + 1),
    name: `Token ${token.tokenId || index + 1}`,
    image: "",
    description: "",
    tokenType: "NFT",
  }));
}

export async function fetchContractMetadata({
  contractAddress,
  network,
}: {
  contractAddress: string;
  network: string;
}): Promise<AlchemyContract> {
  const key = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;

  if (!key) {
    throw new Error("Alchemy API key is not configured.");
  }

  const safeNetwork = normalizeNetwork(network);
  const endpoint = new URL(`https://${safeNetwork}.g.alchemy.com/nft/v3/${key}/getContractMetadata`);
  endpoint.searchParams.set("contractAddress", contractAddress);

  const response = await fetch(endpoint, {
    headers: { accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error("Contract metadata request failed.");
  }

  return (await response.json()) as AlchemyContract;
}

export async function fetchOwnedContracts({
  owner,
  network,
}: {
  owner: string;
  network: string;
}): Promise<AlchemyContract[]> {
  const key = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;

  if (!key) {
    return [];
  }

  const safeNetwork = normalizeNetwork(network);
  const endpoint = new URL(`https://${safeNetwork}.g.alchemy.com/nft/v3/${key}/getContractsForOwner`);
  endpoint.searchParams.set("owner", owner);
  endpoint.searchParams.set("pageSize", "100");

  const contracts: AlchemyContract[] = [];
  let pageKey: string | undefined;

  do {
    if (pageKey) {
      endpoint.searchParams.set("pageKey", pageKey);
    }

    const response = await fetch(endpoint, {
      headers: { accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error("NFT provider request failed.");
    }

    const payload = (await response.json()) as {
      contracts?: AlchemyContract[];
      pageKey?: string;
    };
    contracts.push(...(payload.contracts || []));
    pageKey = payload.pageKey;
  } while (pageKey && contracts.length < 600);

  return contracts;
}

export async function fetchOwnedTokenListings({
  owner,
  network,
  contractAddress,
}: {
  owner: string;
  network: string;
  contractAddress: string;
}): Promise<AlchemyTokenListing[]> {
  const key = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;

  if (!key) {
    return [];
  }

  const safeNetwork = normalizeNetwork(network);
  const endpoint = new URL(`https://${safeNetwork}.g.alchemy.com/nft/v3/${key}/getNFTsForOwner`);
  endpoint.searchParams.set("owner", owner);
  endpoint.searchParams.set("withMetadata", "false");
  endpoint.searchParams.set("pageSize", "100");
  endpoint.searchParams.append("contractAddresses[]", contractAddress);

  const tokens: AlchemyTokenListing[] = [];
  let pageKey: string | undefined;

  do {
    if (pageKey) {
      endpoint.searchParams.set("pageKey", pageKey);
    }

    const response = await fetch(endpoint, {
      headers: { accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error("NFT token list request failed.");
    }

    const payload = (await response.json()) as {
      ownedNfts?: AlchemyTokenListing[];
      pageKey?: string;
    };
    tokens.push(...(payload.ownedNfts || []));
    pageKey = payload.pageKey;
  } while (pageKey && tokens.length < 600);

  return tokens;
}

export async function fetchOwnedNfts({
  owner,
  network,
  contractAddress,
}: {
  owner: string;
  network: string;
  contractAddress?: string;
}): Promise<AlchemyNft[]> {
  const key = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;

  if (!key) {
    return [];
  }

  const safeNetwork = normalizeNetwork(network);
  const endpoint = new URL(`https://${safeNetwork}.g.alchemy.com/nft/v3/${key}/getNFTsForOwner`);
  endpoint.searchParams.set("owner", owner);
  endpoint.searchParams.set("withMetadata", "true");
  endpoint.searchParams.set("pageSize", "100");

  if (contractAddress) {
    endpoint.searchParams.append("contractAddresses[]", contractAddress);
  }

  const nfts: AlchemyNft[] = [];
  let pageKey: string | undefined;

  do {
    if (pageKey) {
      endpoint.searchParams.set("pageKey", pageKey);
    }

    const response = await fetch(endpoint, {
      headers: { accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error("NFT provider request failed.");
    }

    const payload = (await response.json()) as { ownedNfts?: AlchemyNft[]; pageKey?: string };
    nfts.push(...(payload.ownedNfts || []));
    pageKey = payload.pageKey;
  } while (pageKey && nfts.length < 600);

  return nfts;
}

export async function fetchNftMetadata({
  contractAddress,
  network,
  tokenId,
}: {
  contractAddress: string;
  network: string;
  tokenId: string;
}): Promise<AlchemyNft> {
  const key = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;

  if (!key) {
    throw new Error("Alchemy API key is not configured.");
  }

  const safeNetwork = normalizeNetwork(network);
  const endpoint = new URL(`https://${safeNetwork}.g.alchemy.com/nft/v3/${key}/getNFTMetadata`);
  endpoint.searchParams.set("contractAddress", contractAddress);
  endpoint.searchParams.set("tokenId", tokenId);
  endpoint.searchParams.set("refreshCache", "false");

  const response = await fetch(endpoint, {
    headers: { accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error("NFT metadata request failed.");
  }

  return (await response.json()) as AlchemyNft;
}
