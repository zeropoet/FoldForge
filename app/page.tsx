"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveOwner } from "./ens";
import { fallbackGradient, fetchOwnedContracts, isVideoUrl, normalizeNetwork, summarizeContracts } from "./nft-data";

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

const networkOptions = [
  { label: "Ethereum", value: "eth-mainnet" },
  { label: "Base", value: "base-mainnet" },
  { label: "Polygon", value: "polygon-mainnet" },
  { label: "Arbitrum", value: "arb-mainnet" },
];

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function isOwnerInput(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value) || /^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.eth$/i.test(value);
}

export default function FoldForge() {
  const requestSequence = useRef(0);
  const [queryDefaults, setQueryDefaults] = useState({ owner: "", network: networkOptions[0].value });
  const [queryReady, setQueryReady] = useState(false);
  const [wallet, setWallet] = useState("");
  const [manualAddress, setManualAddress] = useState(queryDefaults.owner);
  const [ownerIdentity, setOwnerIdentity] = useState<OwnerIdentity | null>(null);
  const [network, setNetwork] = useState(queryDefaults.network);
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
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

  const loadCollections = useCallback(async (owner: string, selectedNetwork: string) => {
    const requestId = requestSequence.current + 1;
    requestSequence.current = requestId;
    setState("loading");
    setMessage("");
    setCollections([]);
    setOwnerIdentity(null);

    try {
      if (!process.env.NEXT_PUBLIC_ALCHEMY_API_KEY) throw new Error("Set NEXT_PUBLIC_ALCHEMY_API_KEY to load live collections.");
      const resolvedOwner = await resolveOwner(owner);
      const contracts = await fetchOwnedContracts({ owner: resolvedOwner.address, network: selectedNetwork });

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
          `${window.location.pathname}?owner=${encodeURIComponent(routedOwner)}&network=${encodeURIComponent(selectedNetwork)}`,
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
    const defaults = { owner: query.get("owner") || "", network: normalizeNetwork(query.get("network")) };
    queueMicrotask(() => {
      setQueryDefaults(defaults);
      setManualAddress(defaults.owner);
      setNetwork(defaults.network);
      setQueryReady(true);
    });
  }, []);

  useEffect(() => {
    if (queryReady && queryDefaults.owner) {
      queueMicrotask(() => {
        void loadCollections(queryDefaults.owner, queryDefaults.network);
      });
    }
  }, [loadCollections, queryDefaults, queryReady]);

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
      await loadCollections(account, network);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Wallet connection failed.");
    }
  }

  function handleNetworkChange(nextNetwork: string) {
    setNetwork(nextNetwork);

    if (isOwnerInput(navigableOwner)) {
      void loadCollections(navigableOwner, nextNetwork);
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
    void loadCollections(address, network);
  }

  return (
    <main className="min-h-screen bg-[#0c0d0b] text-[#f4f0e8]">
      <section className="grid min-h-screen grid-rows-[auto_1fr]">
        <header className="border-b border-[#2b2c27] bg-[#11120f]/94 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center border border-[#d7ff6a] bg-[#d7ff6a] text-sm font-black text-[#11120f]">
                FF
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-normal">FoldForge</h1>
                <p className="text-xs uppercase tracking-[0.18em] text-[#aaa79c]">
                  Collection grid
                </p>
              </div>
            </div>

            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
              <select
                className="h-10 w-full border border-[#3a3b34] bg-[#171813] px-3 text-sm text-[#f4f0e8] outline-none sm:w-auto"
                disabled={isBusy}
                value={network}
                onChange={(event) => handleNetworkChange(event.target.value)}
              >
                {networkOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                className="h-10 w-full border border-[#d7ff6a] bg-[#d7ff6a] px-4 text-sm font-bold text-[#11120f] transition hover:bg-[#ecff9b] sm:w-auto"
                disabled={isBusy}
                onClick={connectWallet}
                type="button"
              >
                {state === "connecting" ? "Connecting" : wallet ? shortAddress(wallet) : "Connect"}
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto grid w-full max-w-7xl grid-rows-[auto_auto_1fr] gap-4 px-4 py-5">
          <form
            className="grid gap-3 border-b border-[#2b2c27] pb-4 md:grid-cols-[1fr_auto] md:items-end"
            onSubmit={importAddress}
          >
            <label className="grid gap-2">
              <span className="text-xs uppercase tracking-[0.18em] text-[#aaa79c]">Wallet</span>
              <input
                className="h-12 w-full border border-[#3a3b34] bg-[#151612] px-3 text-base text-[#f4f0e8] outline-none transition placeholder:text-[#747267] focus:border-[#d7ff6a]"
                disabled={isBusy}
                onChange={(event) => setManualAddress(event.target.value)}
                placeholder="vitalik.eth or 0x..."
                value={manualAddress}
              />
            </label>
            <button
              className="h-12 border border-[#f4f0e8] px-5 text-sm font-bold text-[#f4f0e8] transition hover:border-[#d7ff6a] hover:text-[#d7ff6a]"
              disabled={isBusy}
              type="submit"
            >
              {state === "loading" ? "Loading" : "Import"}
            </button>
          </form>

          <div className="grid grid-cols-1 border border-[#2b2c27] bg-[#11120f] sm:grid-cols-3">
            <div className="border-b border-[#2b2c27] p-3 sm:border-b-0 sm:border-r">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[#8d8b80]">Address</p>
              <p className="mt-1 truncate text-sm font-semibold">
                {ownerIdentity?.ensName
                  ? ownerIdentity.ensName
                  : resolvedAddress
                    ? shortAddress(resolvedAddress)
                    : activeOwner
                      ? activeOwner
                      : "None"}
              </p>
              {ownerIdentity?.ensName ? (
                <p className="mt-1 truncate font-mono text-xs text-[#8d8b80]">
                  {shortAddress(ownerIdentity.address)}
                </p>
              ) : null}
            </div>
            <div className="border-b border-[#2b2c27] p-3 sm:border-b-0 sm:border-r">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[#8d8b80]">Collections</p>
              <p className="mt-1 text-sm font-semibold">{collections.length}</p>
            </div>
            <div className="p-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[#8d8b80]">Pieces</p>
              <p className="mt-1 text-sm font-semibold">{totalPieces}</p>
            </div>
          </div>

          {message ? (
            <div className="border border-[#5d4f2a] bg-[#1a1710] px-3 py-2 text-sm text-[#e6ce88]">
              {message}
            </div>
          ) : null}

          <section className="overflow-hidden border border-[#2b2c27] bg-[#2b2c27]">
            {state === "loading" || state === "connecting" ? (
              <div className="grid grid-cols-1 gap-px sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div className="min-h-[320px] animate-pulse bg-[#141511]" key={index} />
                ))}
              </div>
            ) : collections.length ? (
              <div className="masonry-grid">
                {collections.map((collection) => (
                  <Link
                    aria-label={`Open ${collection.name}`}
                    className="masonry-item self-start group bg-[#11120f] align-top outline-none transition hover:bg-[#151711] focus-visible:ring-2 focus-visible:ring-[#d7ff6a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0d0b]"
                    href={`/?owner=${encodeURIComponent(navigableOwner)}&network=${encodeURIComponent(network)}`}
                    key={collection.address}
                  >
                    <article>
                      <div
                        className="overflow-hidden bg-[#181914]"
                        style={{ background: collection.image ? undefined : fallbackGradient(collection.address) }}
                      >
                        {collection.image ? (
                          isVideoUrl(collection.image) ? (
                            <video
                              autoPlay
                              className="block h-auto w-full transition duration-300 group-hover:scale-[1.02]"
                              loop
                              muted
                              playsInline
                              src={collection.image}
                            />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              alt=""
                              className="block h-auto w-full transition duration-300 group-hover:scale-[1.02]"
                              src={collection.image}
                            />
                          )
                        ) : (
                          <div className="grid aspect-square place-items-center text-sm font-semibold text-[#d7ff6a]">
                            {collection.symbol || shortAddress(collection.address)}
                          </div>
                        )}
                      </div>
                      <div className="grid gap-3 border-t border-[#2b2c27] p-4">
                        <div className="min-w-0">
                          <h2 className="truncate text-base font-semibold group-hover:text-[#d7ff6a]">
                            {collection.name}
                          </h2>
                          <p className="mt-1 truncate font-mono text-xs text-[#aaa79c]">
                            {collection.symbol || shortAddress(collection.address)}
                          </p>
                          {collection.description ? (
                            <p className="mt-2 line-clamp-2 text-sm leading-5 text-[#b9b6aa]">
                              {collection.description}
                            </p>
                          ) : null}
                        </div>
                        <div className="grid grid-cols-3 gap-px bg-[#2b2c27] text-center text-xs">
                          <div className="bg-[#151612] p-2">
                            <span className="block text-[#8d8b80]">Held</span>
                            <strong>{collection.count}</strong>
                          </div>
                          <div className="bg-[#151612] p-2">
                            <span className="block text-[#8d8b80]">Supply</span>
                            <strong>{collection.totalSupply || "--"}</strong>
                          </div>
                          <div className="bg-[#151612] p-2">
                            <span className="block text-[#8d8b80]">Floor</span>
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
              <div className="col-span-full grid min-h-[50vh] place-items-center bg-[#11120f] p-8 text-center text-[#aaa79c]">
                {state === "ready" ? "No collections found." : "Connect or import a wallet."}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
