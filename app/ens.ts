import { keccak_256 } from "@noble/hashes/sha3.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import { addressPattern } from "./nft-data";

const ensRegistry = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e";
const resolverSelector = "0178b8bf";
const addrSelector = "3b3b57de";
const zeroAddress = "0x0000000000000000000000000000000000000000";

export interface OwnerIdentity {
  input: string;
  address: string;
  ensName: string | null;
}

function stripHexPrefix(value: string): string {
  return value.startsWith("0x") ? value.slice(2) : value;
}

function normalizeHex(value: Uint8Array): string {
  return `0x${bytesToHex(value)}`;
}

function encodeCall(selector: string, node: string): string {
  return `0x${selector}${stripHexPrefix(node)}`;
}

function decodeAddress(result: string): string | null {
  const hex = stripHexPrefix(result);
  if (hex.length < 64) {
    return null;
  }

  const address = `0x${hex.slice(-40)}`;
  return address.toLowerCase() === zeroAddress ? null : address;
}

function labelhash(label: string): Uint8Array {
  return keccak_256(new TextEncoder().encode(label));
}

export function namehash(name: string): string {
  const labels = name.toLowerCase().split(".").filter(Boolean);
  let node = new Uint8Array(32);

  for (let index = labels.length - 1; index >= 0; index -= 1) {
    const combined = new Uint8Array(64);
    combined.set(node);
    combined.set(labelhash(labels[index]), 32);
    node = keccak_256(combined);
  }

  return normalizeHex(node);
}

async function ethCall(to: string, data: string): Promise<string> {
  const key = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
  if (!key) {
    throw new Error("Alchemy API key is not configured.");
  }

  const response = await fetch(`https://eth-mainnet.g.alchemy.com/v2/${key}`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      id: 1,
      jsonrpc: "2.0",
      method: "eth_call",
      params: [{ to, data }, "latest"],
    }),
  });

  if (!response.ok) {
    throw new Error("ENS provider request failed.");
  }

  const payload = (await response.json()) as { result?: string; error?: { message?: string } };
  if (!payload.result || payload.error) {
    throw new Error(payload.error?.message || "ENS lookup failed.");
  }

  return payload.result;
}

export function isEnsName(value: string): boolean {
  return /^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.eth$/i.test(value.trim());
}

export async function resolveOwner(input: string): Promise<OwnerIdentity> {
  const trimmed = input.trim();

  if (addressPattern.test(trimmed)) {
    return { input: trimmed, address: trimmed, ensName: null };
  }

  if (!isEnsName(trimmed)) {
    throw new Error("Enter a valid Ethereum address or .eth name.");
  }

  const node = namehash(trimmed);
  const resolverResult = await ethCall(ensRegistry, encodeCall(resolverSelector, node));
  const resolver = decodeAddress(resolverResult);

  if (!resolver) {
    throw new Error(`${trimmed} does not have an ENS resolver.`);
  }

  const addrResult = await ethCall(resolver, encodeCall(addrSelector, node));
  const address = decodeAddress(addrResult);

  if (!address) {
    throw new Error(`${trimmed} does not resolve to an Ethereum address.`);
  }

  return { input: trimmed, address, ensName: trimmed.toLowerCase() };
}
