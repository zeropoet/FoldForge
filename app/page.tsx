"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
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

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function isOwnerInput(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value) || /^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.eth$/i.test(value);
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
  const [hiddenCollections, setHiddenCollections] = useState<Set<string>>(new Set());
  const [showHidden, setShowHidden] = useState(false);
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
  const visibleCollections = useMemo(
    () => collections.filter((collection) => showHidden || !hiddenCollections.has(collection.address)),
    [collections, hiddenCollections, showHidden],
  );
  const hiddenCount = collections.length - collections.filter((collection) => !hiddenCollections.has(collection.address)).length;

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
      const contracts = await fetchOwnedContracts({
        owner: resolvedOwner.address,
        network,
        signal: controller.signal,
        onPage: (page) => {
          if (requestId === requestSequence.current) setCollections(summarizeContracts(page));
        },
      });

      if (requestId !== requestSequence.current) {
        return;
      }

      setCollections(summarizeContracts(contracts));
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

  useEffect(() => {
    if (!ownerIdentity?.address) return;
    const key = `foldforge:hidden:${ownerIdentity.address.toLowerCase()}`;
    const stored = window.localStorage.getItem(key);
    queueMicrotask(() => setHiddenCollections(new Set(stored ? JSON.parse(stored) as string[] : [])));
  }, [ownerIdentity?.address]);

  function toggleCollection(address: string) {
    if (!ownerIdentity?.address) return;
    setHiddenCollections((current) => {
      const next = new Set(current);
      if (next.has(address)) next.delete(address); else next.add(address);
      window.localStorage.setItem(`foldforge:hidden:${ownerIdentity.address.toLowerCase()}`, JSON.stringify([...next]));
      return next;
    });
  }

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

  function importAddress(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    if (isBusy) {
      return;
    }

    const address = manualAddress.trim();
    if (!isOwnerInput(address)) {
      setState("error");
      setMessage("Enter a valid Ethereum address or .eth name.");
      return;
    }

    setWallet("");
    void loadCollections(address);
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="grid min-h-screen grid-rows-[auto_1fr]">
        <header className="border-b border-white/25 px-5 py-5 md:px-8">
          <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-6">
            <div className="flex items-baseline gap-5">
              <h1 className="text-lg font-medium uppercase tracking-[0.22em]">FoldForge</h1>
              <p className="hidden text-[10px] uppercase tracking-[0.28em] text-white/45 sm:block">
                Ethereum archive
              </p>
            </div>
            <button
              className="border border-white/50 px-5 py-2.5 text-[10px] font-medium uppercase tracking-[0.2em] transition hover:bg-white hover:text-black"
              disabled={isBusy}
              onClick={connectWallet}
              type="button"
            >
              {state === "connecting" ? "Connecting" : wallet ? shortAddress(wallet) : "Connect wallet"}
            </button>
          </div>
        </header>

        <div className="mx-auto grid w-full max-w-[1600px] grid-rows-[auto_auto_1fr] px-5 py-10 md:px-8 md:py-16">
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
          <form
            className="grid border-b border-white/25 md:grid-cols-[1fr_auto]"
            onSubmit={importAddress}
          >
            <label className="grid gap-4 pb-7 md:pb-9">
              <span className="text-[10px] uppercase tracking-[0.28em] text-white/45">Collection owner</span>
              <input
                className="w-full bg-transparent text-4xl font-light tracking-[-0.04em] text-white outline-none placeholder:text-white/20 sm:text-6xl md:text-7xl"
                disabled={isBusy}
                onChange={(event) => setManualAddress(event.target.value)}
                placeholder="ENS or 0x address"
                value={manualAddress}
              />
            </label>
            <button
              className="mb-7 self-end border border-white px-7 py-4 text-[10px] font-medium uppercase tracking-[0.22em] transition hover:bg-white hover:text-black md:mb-9 md:ml-8"
              disabled={isBusy}
              type="submit"
            >
              {state === "loading" ? "Indexing" : "View archive"}
            </button>
          </form>

          <div className="grid border-b border-white/25 sm:grid-cols-3">
            <div className="border-b border-white/25 py-6 sm:border-b-0 sm:border-r sm:border-white/25 sm:px-6 sm:first:pl-0">
              <p className="text-[9px] uppercase tracking-[0.25em] text-white/40">Identity</p>
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
            <div className="border-b border-white/25 py-6 sm:border-b-0 sm:border-r sm:border-white/25 sm:px-6">
              <p className="text-[9px] uppercase tracking-[0.25em] text-white/40">Collections</p>
              <p className="mt-3 text-2xl font-light">{collections.length.toString().padStart(2, "0")}</p>
            </div>
            <div className="py-6 sm:px-6">
              <p className="text-[9px] uppercase tracking-[0.25em] text-white/40">Works held</p>
              <p className="mt-3 text-2xl font-light">{totalPieces.toString().padStart(2, "0")}</p>
            </div>
          </div>

          {message ? (
            <div className="border-b border-white/25 px-0 py-5 text-xs uppercase tracking-[0.12em] text-white/60">
              {message}
            </div>
          ) : null}

          <section className="mt-10 md:mt-16">
            <div className="flex items-center justify-between border-b border-white/25 pb-4">
              <p className="text-[9px] uppercase tracking-[0.25em] text-white/40">Collection index / {visibleCollections.length.toString().padStart(2, "0")}</p>
              {hiddenCount ? (
                <button className="text-[9px] uppercase tracking-[0.2em] text-white/45 hover:text-white" onClick={() => setShowHidden((value) => !value)} type="button">
                  {showHidden ? "Hide disabled" : `Show disabled (${hiddenCount})`}
                </button>
              ) : null}
            </div>
            {state === "loading" || state === "connecting" ? (
              <div className="grid">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div className="h-28 animate-pulse border-b border-white/10 bg-[#030303]" key={index} />
                ))}
              </div>
            ) : collections.length ? (
              <div>
                {visibleCollections.map((collection, index) => (
                  <article className={`group grid grid-cols-[1fr_auto] items-stretch border-b border-white/25 ${hiddenCollections.has(collection.address) ? "opacity-35" : ""}`} key={collection.address}>
                    <a className="grid min-w-0 gap-5 py-7 pr-6 outline-none sm:grid-cols-[70px_1fr_auto] sm:items-baseline md:py-10" href={`?owner=${encodeURIComponent(navigableOwner)}&collection=${collection.address}`}>
                      <span className="font-mono text-[9px] text-white/30">{String(index + 1).padStart(2, "0")}</span>
                      <h2 className="truncate text-3xl font-light tracking-[-0.045em] transition group-hover:translate-x-2 sm:text-4xl md:text-6xl">{collection.name}</h2>
                      <div className="flex items-center gap-5 text-[9px] uppercase tracking-[0.18em] text-white/35">
                        <span>{collection.symbol || shortAddress(collection.address)}</span>
                        <span>{collection.count.toString().padStart(2, "0")} works</span>
                      </div>
                    </a>
                    <button aria-label={`${hiddenCollections.has(collection.address) ? "Show" : "Hide"} ${collection.name}`} className="w-16 border-l border-white/15 text-[9px] uppercase tracking-[0.16em] text-white/35 transition hover:bg-white hover:text-black sm:w-24" onClick={() => toggleCollection(collection.address)} type="button">
                      {hiddenCollections.has(collection.address) ? "On" : "Off"}
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="col-span-full grid min-h-[50vh] place-items-center bg-black p-8 text-center text-xs uppercase tracking-[0.2em] text-white/40">
                {state === "ready" ? "No collections found" : "Enter an identity to begin"}
              </div>
            )}
          </section>
          </>)}
        </div>
      </section>
    </main>
  );
}
