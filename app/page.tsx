"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveOwner } from "./ens";
import { AlchemyNft, fallbackGradient, fetchOwnedContracts, fetchOwnedNfts, isVideoUrl, summarizeContracts, tokenImageFor } from "./nft-data";

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

export default function FoldForge() {
  const requestSequence = useRef(0);
  const [queryOwner, setQueryOwner] = useState(defaultOwner);
  const [queryReady, setQueryReady] = useState(false);
  const [wallet, setWallet] = useState("");
  const [manualAddress, setManualAddress] = useState(defaultOwner);
  const [ownerIdentity, setOwnerIdentity] = useState<OwnerIdentity | null>(null);
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [selectedContract, setSelectedContract] = useState("");
  const [selectedTokenId, setSelectedTokenId] = useState("");
  const [tokens, setTokens] = useState<AlchemyNft[]>([]);
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

    try {
      if (!process.env.NEXT_PUBLIC_ALCHEMY_API_KEY) throw new Error("Set NEXT_PUBLIC_ALCHEMY_API_KEY to load live collections.");
      const resolvedOwner = await resolveOwner(owner);
      const contracts = await fetchOwnedContracts({ owner: resolvedOwner.address, network });

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
    queueMicrotask(async () => {
      setDetailLoading(true);
      setMessage("");
      try {
        setTokens(await fetchOwnedNfts({ owner: ownerIdentity.address, network, contractAddress: selectedContract }));
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Collection detail failed.");
      } finally {
        setDetailLoading(false);
      }
    });
  }, [ownerIdentity, selectedContract]);

  const selectedCollection = collections.find((collection) => collection.address === selectedContract);
  const selectedToken = tokens.find((token) => token.tokenId === selectedTokenId);

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
                <Link className="text-[10px] uppercase tracking-[0.22em] text-white/50 hover:text-white" href={`/?owner=${encodeURIComponent(navigableOwner)}`}>
                  ← All collections
                </Link>
                <a className="text-[10px] uppercase tracking-[0.22em] text-white/50 hover:text-white" href={`https://etherscan.io/address/${selectedContract}`} rel="noreferrer" target="_blank">
                  Contract ↗
                </a>
              </div>

              {selectedTokenId ? (
                selectedToken ? (
                  <article className="grid border-b border-white/25 lg:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
                    <div className="grid min-h-[50vh] place-items-center border-b border-white/25 bg-[#080808] lg:border-b-0 lg:border-r lg:border-white/25">
                      {tokenImageFor(selectedToken) ? (
                        isVideoUrl(tokenImageFor(selectedToken)) ? (
                          <video className="max-h-[80vh] w-full object-contain" controls playsInline src={tokenImageFor(selectedToken)} />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img alt={selectedToken.name || `Token ${selectedTokenId}`} className="max-h-[80vh] w-full object-contain" src={tokenImageFor(selectedToken)} />
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
                        {tokenImageFor(selectedToken) ? <a className="border border-white/40 px-4 py-3 text-[9px] uppercase tracking-[0.18em] hover:border-white" href={tokenImageFor(selectedToken).replace("ipfs://", "https://ipfs.io/ipfs/")} rel="noreferrer" target="_blank">Media file ↗</a> : null}
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
                        <Link className="group bg-black" href={`/?owner=${encodeURIComponent(navigableOwner)}&collection=${selectedContract}&token=${encodeURIComponent(token.tokenId || "")}`} key={token.tokenId}>
                          <div className="aspect-square overflow-hidden bg-[#080808]">
                            {tokenImageFor(token) ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img alt="" className="h-full w-full object-cover grayscale transition duration-500 group-hover:grayscale-0" src={tokenImageFor(token)} />
                            ) : null}
                          </div>
                          <div className="border-t border-white/25 p-4"><h3 className="truncate text-sm font-light">{token.name || `Token ${token.tokenId}`}</h3><p className="mt-2 font-mono text-[9px] text-white/35">#{token.tokenId}</p></div>
                        </Link>
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

          <section className="mt-10 overflow-hidden border border-white/25 bg-white/25 md:mt-16">
            {state === "loading" || state === "connecting" ? (
              <div className="grid grid-cols-1 gap-px sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div className="min-h-[380px] animate-pulse bg-[#080808]" key={index} />
                ))}
              </div>
            ) : collections.length ? (
              <div className="masonry-grid">
                {collections.map((collection) => (
                  <Link
                    aria-label={`Open ${collection.name}`}
                    className="masonry-item self-start group bg-black align-top outline-none transition focus-visible:ring-1 focus-visible:ring-white"
                    href={`/?owner=${encodeURIComponent(navigableOwner)}&collection=${collection.address}`}
                    key={collection.address}
                  >
                    <article>
                      <div
                        className="overflow-hidden bg-[#0a0a0a]"
                        style={{ background: collection.image ? undefined : fallbackGradient(collection.address) }}
                      >
                        {collection.image ? (
                          isVideoUrl(collection.image) ? (
                            <video
                              autoPlay
                              className="block h-auto w-full grayscale transition duration-500 group-hover:scale-[1.015] group-hover:grayscale-0"
                              loop
                              muted
                              playsInline
                              src={collection.image}
                            />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              alt=""
                              className="block h-auto w-full grayscale transition duration-500 group-hover:scale-[1.015] group-hover:grayscale-0"
                              src={collection.image}
                            />
                          )
                        ) : (
                          <div className="grid aspect-square place-items-center text-xs uppercase tracking-[0.22em] text-white/45">
                            {collection.symbol || shortAddress(collection.address)}
                          </div>
                        )}
                      </div>
                      <div className="grid gap-5 border-t border-white/25 p-5">
                        <div className="min-w-0">
                          <h2 className="truncate text-lg font-light tracking-[-0.02em]">
                            {collection.name}
                          </h2>
                          <p className="mt-2 truncate font-mono text-[9px] uppercase tracking-[0.14em] text-white/40">
                            {collection.symbol || shortAddress(collection.address)}
                          </p>
                          {collection.description ? (
                            <p className="mt-4 line-clamp-2 text-xs leading-5 text-white/50">
                              {collection.description}
                            </p>
                          ) : null}
                        </div>
                        <div className="grid grid-cols-3 gap-px bg-white/20 text-center text-[10px]">
                          <div className="bg-black p-2.5">
                            <span className="block uppercase tracking-[0.12em] text-white/35">Held</span>
                            <strong>{collection.count}</strong>
                          </div>
                          <div className="bg-black p-2.5">
                            <span className="block uppercase tracking-[0.12em] text-white/35">Supply</span>
                            <strong>{collection.totalSupply || "--"}</strong>
                          </div>
                          <div className="bg-black p-2.5">
                            <span className="block uppercase tracking-[0.12em] text-white/35">Floor</span>
                            <strong>
                              {collection.floorPrice === null ? "--" : collection.floorPrice.toFixed(2)}
                            </strong>
                          </div>
                        </div>
                      </div>
                    </article>
                  </Link>
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
