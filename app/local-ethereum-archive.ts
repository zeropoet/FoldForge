import type { AlchemyNft, CollectionSummary } from "./nft-data";

interface LocalToken {
  contract: string;
  token_id: string;
  token_uri: string;
  name: string;
  description: string;
  token_type: string;
  attributes: Array<{ trait_type?: string; value?: string | number }>;
  media: { path: string; media_type: string } | null;
  animation: { path: string; media_type: string } | null;
  holding_state?: "current" | "unobserved";
  owners?: string[];
}

interface LocalContract {
  address: string;
  name: string;
  symbol: string;
  description: string;
  total_supply: string;
  image: string;
  token_ids: string[];
  owners?: string[];
}

export interface LocalArchiveOwner {
  name: string;
  contract_count: number;
  work_count: number;
  observed_work_count?: number;
  witness: string;
}

export interface LocalArchive {
  schema: "foldforge-ethereum-archive/v1" | "foldforge-ethereum-archive/v2";
  owner?: string;
  owners?: LocalArchiveOwner[];
  contracts: LocalContract[];
  tokens: LocalToken[];
}

let archivePromise: Promise<LocalArchive | null> | null = null;
const fldfrgContract = "0x16bc29ea6e1b9390f70349bfb93ea87ffc9105fc";

function isResolvedWork(token: LocalToken): boolean {
  return token.contract !== fldfrgContract || !/^#?\s*\d+$/.test(token.name.trim());
}

export function fetchLocalEthereumArchive(): Promise<LocalArchive | null> {
  archivePromise ??= fetch("/ethereum-archive/index.json", { headers: { accept: "application/json" } })
    .then(async (response) => response.ok ? await response.json() as LocalArchive : null)
    .catch(() => null);
  return archivePromise;
}

export function localCollections(archive: LocalArchive | null): CollectionSummary[] {
  return (archive?.contracts || []).map((contract) => ({
    address: contract.address,
    name: contract.name,
    symbol: contract.symbol,
    count: contract.address === fldfrgContract
      ? (archive?.tokens || []).filter((token) => token.contract === contract.address && isResolvedWork(token)).length
      : contract.token_ids.length,
    image: contract.image,
    description: contract.description,
    totalSupply: contract.total_supply,
    floorPrice: null,
  }));
}

export function localTokens(archive: LocalArchive | null, contractAddress?: string, owner?: string): AlchemyNft[] {
  return (archive?.tokens || [])
    .filter((token) => isResolvedWork(token) && (!contractAddress || token.contract === contractAddress.toLowerCase()) && (!owner || token.owners?.includes(owner.toLowerCase())))
    .map((token) => ({
      tokenId: token.token_id,
      tokenUri: token.token_uri,
      name: token.name,
      description: token.description,
      tokenType: token.token_type,
      contract: { address: token.contract, tokenType: token.token_type },
      image: token.media?.media_type.startsWith("image/") ? { originalUrl: token.media.path } : undefined,
      animation: token.animation ? { originalUrl: token.animation.path } : token.media && !token.media.media_type.startsWith("image/") ? { originalUrl: token.media.path } : undefined,
      raw: { metadata: { attributes: token.attributes } },
    }));
}

function tokenKey(token: AlchemyNft): string {
  return `${token.contract?.address?.toLowerCase() || ""}:${token.tokenId || ""}`;
}

/**
 * Ethereum establishes which works are currently held. The repository archive is
 * authoritative for media and metadata already resolved from each tokenURI.
 */
export function preferLocalTokens(live: AlchemyNft[], archived: AlchemyNft[]): AlchemyNft[] {
  const localByKey = new Map(archived.map((token) => [tokenKey(token), token]));
  const locallyIndexedContracts = new Set(archived.map((token) => token.contract?.address?.toLowerCase()).filter(Boolean));
  const merged = live
    .filter((token) => !locallyIndexedContracts.has(token.contract?.address?.toLowerCase()) || localByKey.has(tokenKey(token)))
    .map((token) => localByKey.get(tokenKey(token)) || token);
  const seen = new Set(merged.map(tokenKey));
  return [...merged, ...archived.filter((token) => !seen.has(tokenKey(token)))];
}

export function preferLocalToken(live: AlchemyNft, archived?: AlchemyNft): AlchemyNft {
  return archived || live;
}

export function preferLocalCollections(
  live: CollectionSummary[],
  archived: CollectionSummary[],
): CollectionSummary[] {
  const localByAddress = new Map(archived.map((collection) => [collection.address.toLowerCase(), collection]));
  return live.map((collection) => {
    const local = localByAddress.get(collection.address.toLowerCase());
    return local ? { ...collection, ...local, count: collection.count } : collection;
  });
}
