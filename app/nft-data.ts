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
      image?: string | null;
      image_url?: string | null;
      animation_url?: string | null;
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

export function normalizeMediaUrl(value: string | null | undefined): string {
  const url = value?.trim() || "";
  if (url.startsWith("ipfs://ipfs/")) return `https://ipfs.io/ipfs/${url.slice(12)}`;
  if (url.startsWith("ipfs://")) return `https://ipfs.io/ipfs/${url.slice(7)}`;
  if (url.startsWith("ipns://")) return `https://ipfs.io/ipns/${url.slice(7)}`;
  if (url.startsWith("ar://")) return `https://arweave.net/${url.slice(5)}`;
  return url;
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
    ""
  );
}

export function tokenThumbnailFor(nft: AlchemyNft): string {
  return normalizeMediaUrl(
    nft.image?.thumbnailUrl ||
    nft.image?.cachedUrl ||
    nft.image?.pngUrl ||
    nft.image?.originalUrl ||
    "",
  );
}

export function optimizedImageUrl(
  value: string,
  {
    width,
    height = width,
    quality = 88,
  }: {
    width: number;
    height?: number;
    quality?: number;
  },
): string {
  const source = normalizeMediaUrl(value);
  if (!/^https?:\/\//i.test(source)) return source;

  const endpoint = new URL("https://images.weserv.nl/");
  endpoint.searchParams.set("url", source);
  endpoint.searchParams.set("w", String(width));
  endpoint.searchParams.set("h", String(height));
  endpoint.searchParams.set("fit", "cover");
  endpoint.searchParams.set("output", "webp");
  endpoint.searchParams.set("q", String(quality));
  return endpoint.toString();
}

const responseCache = new Map<string, { expires: number; value: unknown }>();
const CACHE_TTL = 5 * 60 * 1000;

function cached<T>(key: string): T | undefined {
  const entry = responseCache.get(key);
  if (!entry || entry.expires < Date.now()) {
    responseCache.delete(key);
    return undefined;
  }
  return entry.value as T;
}

function remember<T>(key: string, value: T): T {
  responseCache.set(key, { expires: Date.now() + CACHE_TTL, value });
  return value;
}

async function providerFetch<T>(endpoint: URL, signal?: AbortSignal): Promise<T> {
  const response = await fetch(endpoint, { headers: { accept: "application/json" }, signal });
  if (!response.ok) {
    if (response.status === 429) throw new Error("Ethereum data provider is busy. Try again in a moment.");
    throw new Error(`Ethereum data request failed (${response.status}).`);
  }
  return response.json() as Promise<T>;
}

async function hydrateCanonicalMedia(nft: AlchemyNft, signal?: AbortSignal): Promise<AlchemyNft> {
  if (tokenImageFor(nft) || !nft.tokenUri) return nft;

  const metadataUrl = normalizeMediaUrl(nft.tokenUri);
  if (!/^https?:\/\//i.test(metadataUrl)) return nft;

  try {
    const response = await fetch(metadataUrl, {
      headers: { accept: "application/json" },
      signal,
    });
    if (!response.ok) return nft;

    const metadata = (await response.json()) as {
      image?: string | null;
      image_url?: string | null;
      animation_url?: string | null;
      attributes?: Array<{ trait_type?: string; value?: string | number }>;
    };
    const image = normalizeMediaUrl(metadata.image_url || metadata.image);
    const animation = normalizeMediaUrl(metadata.animation_url);

    return {
      ...nft,
      image: image ? { ...nft.image, originalUrl: image } : nft.image,
      animation: animation ? { ...nft.animation, originalUrl: animation } : nft.animation,
      raw: {
        ...nft.raw,
        metadata: {
          ...nft.raw?.metadata,
          ...metadata,
        },
      },
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return nft;
  }
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
  signal,
  onPage,
}: {
  owner: string;
  network: string;
  signal?: AbortSignal;
  onPage?: (contracts: AlchemyContract[]) => void;
}): Promise<AlchemyContract[]> {
  const key = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;

  if (!key) {
    return [];
  }

  const safeNetwork = normalizeNetwork(network);
  const cacheKey = `contracts:${safeNetwork}:${owner.toLowerCase()}`;
  const hit = cached<AlchemyContract[]>(cacheKey);
  if (hit) {
    onPage?.(hit);
    return hit;
  }
  const endpoint = new URL(`https://${safeNetwork}.g.alchemy.com/nft/v3/${key}/getContractsForOwner`);
  endpoint.searchParams.set("owner", owner);
  endpoint.searchParams.set("pageSize", "100");

  const contracts: AlchemyContract[] = [];
  let pageKey: string | undefined;

  do {
    if (pageKey) {
      endpoint.searchParams.set("pageKey", pageKey);
    }

    const payload = await providerFetch<{
      contracts?: AlchemyContract[];
      pageKey?: string;
    }>(endpoint, signal);
    contracts.push(...(payload.contracts || []));
    onPage?.([...contracts]);
    pageKey = payload.pageKey;
  } while (pageKey && contracts.length < 600);

  return remember(cacheKey, contracts);
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
  signal,
  onPage,
}: {
  owner: string;
  network: string;
  contractAddress?: string;
  signal?: AbortSignal;
  onPage?: (nfts: AlchemyNft[]) => void;
}): Promise<AlchemyNft[]> {
  const key = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;

  if (!key) {
    return [];
  }

  const safeNetwork = normalizeNetwork(network);
  const cacheKey = `nfts:${safeNetwork}:${owner.toLowerCase()}:${contractAddress?.toLowerCase() || "all"}`;
  const hit = cached<AlchemyNft[]>(cacheKey);
  if (hit) {
    onPage?.(hit);
    return hit;
  }
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

    const payload = await providerFetch<{ ownedNfts?: AlchemyNft[]; pageKey?: string }>(endpoint, signal);
    const page = await Promise.all((payload.ownedNfts || []).map((nft) => hydrateCanonicalMedia(nft, signal)));
    nfts.push(...page);
    onPage?.([...nfts]);
    pageKey = payload.pageKey;
  } while (pageKey && nfts.length < 600);

  return remember(cacheKey, nfts);
}

export async function fetchNftMetadata({
  contractAddress,
  network,
  tokenId,
  signal,
}: {
  contractAddress: string;
  network: string;
  tokenId: string;
  signal?: AbortSignal;
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

  const cacheKey = `token:${safeNetwork}:${contractAddress.toLowerCase()}:${tokenId}`;
  const hit = cached<AlchemyNft>(cacheKey);
  if (hit) return hit;
  const nft = await providerFetch<AlchemyNft>(endpoint, signal);
  return remember(cacheKey, await hydrateCanonicalMedia(nft, signal));
}
