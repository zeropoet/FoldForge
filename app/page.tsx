"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isCollectionAllowed } from "./collection-policy";
import { resolveOwner } from "./ens";
import { AlchemyNft, fetchNftMetadata, fetchOwnedContracts, fetchOwnedNfts, isVideoUrl, normalizeMediaUrl, summarizeContracts, tokenImageFor, tokenThumbnailFor } from "./nft-data";

type LoadState = "idle" | "connecting" | "loading" | "ready" | "error";

interface CollectionSummary {
  address: string;
  name: string;
  symbol: string;
  count: number;
  image: string;
  description: string;
  totalSupply: string;
  floorPrice: number | null;
}

interface OwnerIdentity {
  input: string;
  address: string;
  ensName: string | null;
}

interface EthereumProvider {
  request<T = unknown>(args: { method: string; params?: unknown[] }): Promise<T>;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

const defaultOwner = "zeropoet.eth";
const network = "eth-mainnet";
const archiveLineage = [
  {
    owner: "mancel.eth",
    order: "01",
    role: "Foundation",
    description: "Origin archive",
  },
  {
    owner: "zeropoet.eth",
    order: "02",
    role: "Lineage",
    description: "Living continuation",
  },
] as const;

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function mintedMediaFor(token: AlchemyNft): string {
  const media = token.animation?.cachedUrl || token.animation?.originalUrl || tokenImageFor(token);
  return normalizeMediaUrl(media);
}

function hasVideoMedia(token: AlchemyNft): boolean {
  return Boolean(token.animation?.cachedUrl || token.animation?.originalUrl) || isVideoUrl(mintedMediaFor(token));
}

function MediaTile({ token }: { token: AlchemyNft }) {
  const media = hasVideoMedia(token) ? mintedMediaFor(token) : tokenThumbnailFor(token);
  if (!media) return null;
  if (hasVideoMedia(token)) {
    return (
      <video
        aria-label={token.name || `Token ${token.tokenId || ""}`}
        className="h-full w-full object-cover grayscale transition duration-500 group-hover:grayscale-0"
        loop
        muted
        onMouseEnter={(event) => void event.currentTarget.play()}
        onMouseLeave={(event) => event.currentTarget.pause()}
        playsInline
        preload="none"
        src={media}
      />
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img alt="" className="h-full w-full object-cover grayscale transition duration-500 group-hover:grayscale-0" decoding="async" loading="lazy" src={media} />;
}

export default function FoldForge() {
  const requestSequence = useRef(0);
  const collectionRequest = useRef<AbortController | null>(null);
  const [queryOwner, setQueryOwner] = useState(defaultOwner);
  const [queryReady, setQueryReady] = useState(false);
  const [wallet, setWallet] = useState("");
  const [manualAddress, setManualAddress] = useState(defaultOwner);
  const [ownerIdentity, setOwnerIdentity] = useState<OwnerIdentity | null>(null);
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [selectedContract, setSelectedContract] = useState("");
  const [selectedTokenId, setSelectedTokenId] = useState("");
  const [tokens, setTokens] = useState<AlchemyNft[]>([]);
  const [tokenDetail, setTokenDetail] = useState<{ key: string; nft: AlchemyNft } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [state, setState] = useState<LoadState>("idle");
  const [message, setMessage] = useState("");

  const activeOwner = wallet || manualAddress.trim();
  const resolvedAddress = ownerIdentity?.address || (wallet ? wallet : "");
  const navigableOwner = ownerIdentity?.ensName || resolvedAddress || activeOwner;
  const isBusy = state === "loading" || state === "connecting";
  const totalPieces = useMemo(
    () => collections.reduce((total, collection) => total + collection.count, 0),
    [collections],
  );

  const loadCollections = useCallback(async (owner: string) => {
    const requestId = requestSequence.current + 1;
    requestSequence.current = requestId;
    setState("loading");
    setMessage("");
    setCollections([]);
    setOwnerIdentity(null);
    collectionRequest.current?.abort();
    const controller = new AbortController();
    collectionRequest.current = controller;

    try {
      if (!process.env.NEXT_PUBLIC_ALCHEMY_API_KEY) throw new Error("Set NEXT_PUBLIC_ALCHEMY_API_KEY to load live collections.");
      const resolvedOwner = await resolveOwner(owner);
      const curate = (contracts: Parameters<typeof summarizeContracts>[0]) =>
        summarizeContracts(contracts).filter((collection) =>
          isCollectionAllowed(resolvedOwner.ensName, collection.address),
        );
      const contracts = await fetchOwnedContracts({
        owner: resolvedOwner.address,
        network,
        signal: controller.signal,
        onPage: (page) => {
          if (requestId === requestSequence.current) setCollections(curate(page));
        },
      });

      if (requestId !== requestSequence.current) {
        return;
      }

      setCollections(curate(contracts));
      setOwnerIdentity(resolvedOwner);
      setState("ready");
      setMessage("");

      if (typeof window !== "undefined") {
        const routedOwner = resolvedOwner.ensName || resolvedOwner.address || owner;
        window.history.replaceState(
          null,
          "",
          `${window.location.pathname}?owner=${encodeURIComponent(routedOwner)}`,
        );
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (requestId !== requestSequence.current) {
        return;
      }

      setCollections([]);
      setOwnerIdentity(null);
      setState("error");
      setMessage(error instanceof Error ? error.message : "Collection load failed.");
    }
  }, []);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const owner = query.get("owner") || defaultOwner;
    const collection = query.get("collection") || "";
    const token = query.get("token") || "";
    queueMicrotask(() => {
      setQueryOwner(owner);
      setManualAddress(owner);
      setSelectedContract(collection);
      setSelectedTokenId(token);
      setQueryReady(true);
    });
  }, []);

  useEffect(() => {
    if (queryReady && queryOwner) {
      queueMicrotask(() => {
        void loadCollections(queryOwner);
      });
    }
  }, [loadCollections, queryOwner, queryReady]);

  useEffect(() => {
    if (!ownerIdentity?.address || !selectedContract) return;
    if (!isCollectionAllowed(ownerIdentity.ensName, selectedContract)) {
      queueMicrotask(() => {
        setSelectedContract("");
        setSelectedTokenId("");
        window.history.replaceState(
          null,
          "",
          `${window.location.pathname}?owner=${encodeURIComponent(ownerIdentity.ensName || ownerIdentity.address)}`,
        );
      });
      return;
    }
    const controller = new AbortController();
    queueMicrotask(async () => {
      setDetailLoading(true);
      setTokens([]);
      setMessage("");
      try {
        await fetchOwnedNfts({
          owner: ownerIdentity.address,
          network,
          contractAddress: selectedContract,
          signal: controller.signal,
          onPage: setTokens,
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setMessage(error instanceof Error ? error.message : "Collection detail failed.");
      } finally {
        if (!controller.signal.aborted) setDetailLoading(false);
      }
    });
    return () => controller.abort();
  }, [ownerIdentity, selectedContract]);

  useEffect(() => {
    if (!selectedContract || !selectedTokenId) return;
    const controller = new AbortController();
    const detailKey = `${selectedContract}:${selectedTokenId}`;
    void fetchNftMetadata({ contractAddress: selectedContract, network, tokenId: selectedTokenId, signal: controller.signal })
      .then((nft) => setTokenDetail({ key: detailKey, nft }))
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setMessage(error instanceof Error ? error.message : "Minted record failed.");
        }
      });
    return () => controller.abort();
  }, [selectedContract, selectedTokenId]);

  const selectedCollection = collections.find((collection) => collection.address === selectedContract);
  const selectedToken = tokenDetail?.key === `${selectedContract}:${selectedTokenId}`
    ? tokenDetail.nft
    : tokens.find((token) => token.tokenId === selectedTokenId);

  async function connectWallet() {
    if (!window.ethereum) {
      setState("error");
      setMessage("No Ethereum wallet found.");
      return;
    }

    setState("connecting");
    setMessage("");

    try {
      const accounts = await window.ethereum.request<string[]>({
        method: "eth_requestAccounts",
      });
      const account = accounts[0] || "";
      setWallet(account);
      setManualAddress("");
      await loadCollections(account);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Wallet connection failed.");
    }
  }

  function selectArchive(owner: string) {
    if (isBusy || owner.toLowerCase() === navigableOwner.toLowerCase()) return;
    setWallet("");
    setManualAddress(owner);
    setSelectedContract("");
    setSelectedTokenId("");
    void loadCollections(owner);
  }

  return (
    <main className="archive-shell min-h-screen bg-black text-white">
      <section className="grid min-h-screen grid-rows-[auto_1fr]">
        <header className="site-header sticky top-0 z-20 border-b border-white/20 px-5 py-3 md:px-8">
          <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 sm:gap-6">
            <a className="flex min-w-0 items-center gap-3 sm:gap-4" href={`?owner=${encodeURIComponent(navigableOwner)}`}>
              <span className="brand-mark" aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt="" src="/favicon.svg" />
              </span>
              <span>
                <span className="block text-base font-medium uppercase tracking-[0.2em] sm:text-lg sm:tracking-[0.22em]">FoldForge</span>
                <span className="mt-1 hidden text-[8px] uppercase tracking-[0.32em] text-white/40 sm:block">Ethereum archive / est. 2026</span>
              </span>
            </a>
            <button
              className="shrink-0 border border-white/50 px-3 py-3 text-[9px] font-medium uppercase tracking-[0.18em] transition hover:bg-white hover:text-black sm:px-5 sm:tracking-[0.22em]"
              disabled={isBusy}
              onClick={connectWallet}
              type="button"
            >
              {state === "connecting" ? "Connecting" : wallet ? shortAddress(wallet) : (
                <>
                  <span className="sm:hidden">Connect</span>
                  <span className="hidden sm:inline">Connect wallet</span>
                </>
              )}
            </button>
          </div>
        </header>

        <div className="mx-auto grid w-full min-w-0 max-w-[1600px] grid-rows-[auto_auto_1fr] px-5 py-9 md:px-8 md:py-14">
          {selectedContract ? (
            <section>
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/25 pb-6">
                <a className="text-[10px] uppercase tracking-[0.22em] text-white/50 hover:text-white" href={`?owner=${encodeURIComponent(navigableOwner)}`}>
                  ← All collections
                </a>
                <a className="text-[10px] uppercase tracking-[0.22em] text-white/50 hover:text-white" href={`https://etherscan.io/address/${selectedContract}`} rel="noreferrer" target="_blank">
                  Contract ↗
                </a>
              </div>

              {selectedTokenId ? (
                selectedToken ? (
                  <article className="grid border-b border-white/25 lg:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
                    <div className="grid min-h-[50vh] place-items-center border-b border-white/25 bg-[#080808] lg:border-b-0 lg:border-r lg:border-white/25">
                      {mintedMediaFor(selectedToken) ? (
                        hasVideoMedia(selectedToken) ? (
                          <video autoPlay className="max-h-[80vh] w-full object-contain" controls loop muted playsInline preload="metadata" src={mintedMediaFor(selectedToken)} />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img alt={selectedToken.name || `Token ${selectedTokenId}`} className="max-h-[80vh] w-full object-contain" decoding="async" fetchPriority="high" src={mintedMediaFor(selectedToken)} />
                        )
                      ) : <div className="text-xs uppercase tracking-[0.2em] text-white/40">No media file</div>}
                    </div>
                    <div className="grid content-start gap-8 p-6 md:p-10">
                      <div>
                        <p className="text-[9px] uppercase tracking-[0.25em] text-white/40">Minted work / #{selectedTokenId}</p>
                        <h2 className="mt-4 text-4xl font-light tracking-[-0.04em]">{selectedToken.name || `Token ${selectedTokenId}`}</h2>
                        <p className="mt-5 text-sm leading-6 text-white/55">{selectedToken.description || "No description recorded in the token metadata."}</p>
                      </div>
                      <dl className="grid gap-px bg-white/20 text-xs">
                        <div className="grid grid-cols-[110px_1fr] bg-black p-4"><dt className="text-white/40">Token ID</dt><dd className="break-all">{selectedTokenId}</dd></div>
                        <div className="grid grid-cols-[110px_1fr] bg-black p-4"><dt className="text-white/40">Standard</dt><dd>{selectedToken.tokenType || selectedToken.contract?.tokenType || "NFT"}</dd></div>
                        <div className="grid grid-cols-[110px_1fr] bg-black p-4"><dt className="text-white/40">Contract</dt><dd className="break-all font-mono text-[10px]">{selectedContract}</dd></div>
                        <div className="grid grid-cols-[110px_1fr] bg-black p-4"><dt className="text-white/40">Token URI</dt><dd className="break-all font-mono text-[10px]">{selectedToken.tokenUri || "Not returned"}</dd></div>
                      </dl>
                      {selectedToken.raw?.metadata?.attributes?.length ? (
                        <div>
                          <p className="mb-3 text-[9px] uppercase tracking-[0.25em] text-white/40">Minted traits</p>
                          <div className="grid grid-cols-2 gap-px bg-white/20">
                            {selectedToken.raw.metadata.attributes.map((trait, index) => (
                              <div className="bg-black p-4" key={`${trait.trait_type}-${index}`}><p className="text-[9px] uppercase tracking-[0.16em] text-white/40">{trait.trait_type || "Trait"}</p><p className="mt-2 text-sm">{trait.value ?? "—"}</p></div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      <div className="flex flex-wrap gap-3">
                        <a className="border border-white px-4 py-3 text-[9px] uppercase tracking-[0.18em] hover:bg-white hover:text-black" href={`https://etherscan.io/nft/${selectedContract}/${selectedTokenId}`} rel="noreferrer" target="_blank">Mint record ↗</a>
                        {selectedToken.tokenUri ? <a className="border border-white/40 px-4 py-3 text-[9px] uppercase tracking-[0.18em] hover:border-white" href={selectedToken.tokenUri.replace("ipfs://", "https://ipfs.io/ipfs/")} rel="noreferrer" target="_blank">Metadata file ↗</a> : null}
                        {mintedMediaFor(selectedToken) ? <a className="border border-white/40 px-4 py-3 text-[9px] uppercase tracking-[0.18em] hover:border-white" href={mintedMediaFor(selectedToken).replace("ipfs://", "https://ipfs.io/ipfs/")} rel="noreferrer" target="_blank">Media file ↗</a> : null}
                      </div>
                    </div>
                  </article>
                ) : <div className="grid min-h-[50vh] place-items-center text-xs uppercase tracking-[0.2em] text-white/40">{detailLoading ? "Loading minted record" : "Minted record unavailable"}</div>
              ) : (
                <>
                  <div className="grid gap-6 border-b border-white/25 py-10 md:grid-cols-[1fr_auto] md:items-end">
                    <div><p className="text-[9px] uppercase tracking-[0.25em] text-white/40">Collection archive</p><h2 className="mt-4 text-4xl font-light tracking-[-0.04em] md:text-6xl">{selectedCollection?.name || shortAddress(selectedContract)}</h2><p className="mt-5 max-w-3xl text-sm leading-6 text-white/50">{selectedCollection?.description}</p></div>
                    <p className="font-mono text-[10px] text-white/40">{selectedContract}</p>
                  </div>
                  {detailLoading ? <div className="grid min-h-[50vh] place-items-center text-xs uppercase tracking-[0.2em] text-white/40">Loading minted works</div> : (
                    <div className="token-grid border-x border-b border-white/25 bg-white/25">
                      {tokens.map((token) => (
                        <a className="group bg-black" href={`?owner=${encodeURIComponent(navigableOwner)}&collection=${selectedContract}&token=${encodeURIComponent(token.tokenId || "")}`} key={token.tokenId}>
                          <div className="aspect-square overflow-hidden bg-[#080808]">
                            <MediaTile token={token} />
                          </div>
                          <div className="border-t border-white/25 p-4"><h3 className="truncate text-sm font-light">{token.name || `Token ${token.tokenId}`}</h3><p className="mt-2 font-mono text-[9px] text-white/35">#{token.tokenId}</p></div>
                        </a>
                      ))}
                    </div>
                  )}
                </>
              )}
            </section>
          ) : (<>
          <section className="min-w-0 border-b border-white/20 pb-9 md:pb-12">
            <div className="mb-5 flex items-center justify-between gap-6">
              <p className="text-[9px] uppercase tracking-[0.3em] text-white/45">Archive lineage / Ethereum mainnet</p>
              <p className="hidden items-center gap-3 font-mono text-[8px] uppercase tracking-[0.18em] text-white/25 sm:flex">
                <span className="h-px w-8 bg-white/20" />
                Foundation / Continuation
              </p>
            </div>
            <div className="lineage-selector grid gap-px bg-white/20 md:grid-cols-2">
              {archiveLineage.map((archive) => {
                const active = archive.owner === (ownerIdentity?.ensName || manualAddress).toLowerCase();
                return (
                  <button
                    aria-current={active ? "page" : undefined}
                    className={`lineage-node group relative grid min-h-40 content-between bg-black p-5 text-left transition sm:min-h-44 md:p-7 ${active ? "is-active" : ""}`}
                    disabled={isBusy}
                    key={archive.owner}
                    onClick={() => selectArchive(archive.owner)}
                    type="button"
                  >
                    <span className="flex items-center justify-between gap-5">
                      <span className="font-mono text-[9px] text-white/35">{archive.order}</span>
                      <span className="text-[8px] uppercase tracking-[0.28em] text-white/35">{archive.role}</span>
                    </span>
                    <span>
                      <span className="block text-3xl font-light uppercase tracking-[-0.035em] sm:text-4xl">{archive.owner}</span>
                      <span className="mt-3 flex items-center gap-3 text-[8px] uppercase tracking-[0.22em] text-white/35">
                        <span className="lineage-marker" aria-hidden="true" />
                        {active ? "Archive in view" : archive.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <div className="archive-metrics grid border-b border-white/20 sm:grid-cols-4">
            <div className="border-b border-white/20 py-5 sm:border-b-0 sm:border-r sm:border-white/20 sm:px-5 sm:first:pl-0">
              <p className="text-[8px] uppercase tracking-[0.25em] text-white/35">Current archive</p>
              <p className="mt-3 truncate text-sm font-medium">
                {ownerIdentity?.ensName
                  ? ownerIdentity.ensName
                  : resolvedAddress
                    ? shortAddress(resolvedAddress)
                    : activeOwner
                      ? activeOwner
                      : "None"}
              </p>
              {ownerIdentity?.ensName ? (
                <p className="mt-1 truncate font-mono text-[10px] text-white/35">
                  {shortAddress(ownerIdentity.address)}
                </p>
              ) : null}
            </div>
            <div className="border-b border-white/20 py-5 sm:border-b-0 sm:border-r sm:border-white/20 sm:px-5">
              <p className="text-[8px] uppercase tracking-[0.25em] text-white/35">Collections</p>
              <p className="mt-3 text-3xl font-light tracking-[-0.04em]">{collections.length.toString().padStart(2, "0")}</p>
            </div>
            <div className="border-b border-white/20 py-5 sm:border-b-0 sm:border-r sm:border-white/20 sm:px-5">
              <p className="text-[8px] uppercase tracking-[0.25em] text-white/35">Works held</p>
              <p className="mt-3 text-3xl font-light tracking-[-0.04em]">{totalPieces.toString().padStart(2, "0")}</p>
            </div>
            <div className="py-5 sm:px-5">
              <p className="text-[8px] uppercase tracking-[0.25em] text-white/35">Index state</p>
              <p className="mt-4 flex items-center gap-3 text-[9px] uppercase tracking-[0.18em] text-white/60">
                <span className={`h-1.5 w-1.5 ${state === "ready" ? "bg-white" : "border border-white/45"}`} />
                {state === "ready" ? "Live holdings" : state === "loading" ? "Resolving" : "Standby"}
              </p>
            </div>
          </div>

          {message ? (
            <div className="border-b border-white/25 px-0 py-5 text-xs uppercase tracking-[0.12em] text-white/60">
              {message}
            </div>
          ) : null}

          <section className="min-w-0 mt-10 md:mt-14">
            <div className="flex items-end justify-between gap-6 border-b border-white/25 pb-4">
              <p className="text-[9px] uppercase tracking-[0.25em] text-white/40">Collection index / {collections.length.toString().padStart(2, "0")}</p>
              <p className="max-w-48 text-right text-[8px] uppercase leading-4 tracking-[0.2em] text-white/25">Curated exclusions / new holdings surface live</p>
            </div>
            {state === "loading" || state === "connecting" ? (
              <div className="grid">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div className="h-28 animate-pulse border-b border-white/10 bg-[#030303]" key={index} />
                ))}
              </div>
            ) : collections.length ? (
              <div className="collection-register border-x border-white/10">
                {collections.map((collection, index) => (
                  <article className="group border-b border-white/25" key={collection.address}>
                    <a className="collection-link grid min-w-0 gap-4 px-4 py-6 outline-none sm:grid-cols-[58px_1fr_auto_18px] sm:items-center md:px-6 md:py-8" href={`?owner=${encodeURIComponent(navigableOwner)}&collection=${collection.address}`}>
                      <span className="font-mono text-[8px] text-white/25">C/{String(index + 1).padStart(2, "0")}</span>
                      <h2 className="truncate text-3xl font-light uppercase tracking-[-0.045em] transition sm:text-4xl md:text-5xl">{collection.name}</h2>
                      <div className="flex items-center gap-4 text-[8px] uppercase tracking-[0.18em] text-white/35">
                        <span>{collection.symbol || shortAddress(collection.address)}</span>
                        <span>{collection.count.toString().padStart(2, "0")} works</span>
                      </div>
                      <span className="collection-arrow hidden text-right text-sm text-white/25 transition sm:block" aria-hidden="true">→</span>
                    </a>
                  </article>
                ))}
              </div>
            ) : (
              <div className="col-span-full grid min-h-[50vh] place-items-center bg-black p-8 text-center text-xs uppercase tracking-[0.2em] text-white/40">
                {state === "ready" ? "No collections found" : "Enter an identity to begin"}
              </div>
            )}
            <div className="mt-5 flex items-center justify-between gap-5 font-mono text-[8px] uppercase tracking-[0.14em] text-white/20">
              <span>Ethereum mainnet</span>
              <span>Contract-indexed / dynamically resolved</span>
            </div>
          </section>
          </>)}
        </div>
      </section>
    </main>
  );
}
