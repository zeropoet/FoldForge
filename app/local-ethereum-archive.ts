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
}

interface LocalContract {
  address: string;
  name: string;
  symbol: string;
  description: string;
  total_supply: string;
  image: string;
  token_ids: string[];
}

interface LocalArchive {
  schema: "foldforge-ethereum-archive/v1";
  contracts: LocalContract[];
  tokens: LocalToken[];
}

let archivePromise: Promise<LocalArchive | null> | null = null;

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
    count: contract.token_ids.length,
    image: contract.image,
    description: contract.description,
    totalSupply: contract.total_supply,
    floorPrice: null,
  }));
}

export function localTokens(archive: LocalArchive | null, contractAddress?: string): AlchemyNft[] {
  return (archive?.tokens || [])
    .filter((token) => !contractAddress || token.contract === contractAddress.toLowerCase())
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
