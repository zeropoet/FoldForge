import { keccak_256 } from "@noble/hashes/sha3.js";

export const FOLDKERNEL_VALUE_RECEIPT_VERSION = "FoldKernel-Value-Receipt-1.0.0" as const;

export interface FoldKernelValueReceipt {
  contractVersion: typeof FOLDKERNEL_VALUE_RECEIPT_VERSION;
  digestAlgorithm: "keccak-256";
  receiptID: string;
  sourceSystem: "foldforge";
  eventID: string;
  artifactDigest: string;
  outputKind: string;
  periodStart: string;
  periodEnd: string;
  state: "evidenced";
  valuationBasis: "none";
  currency: null;
  monetaryCounterpartCents: null;
  valuationEvidenceDigest: null;
  settlementEvidenceDigest: null;
  priorReceiptID: null;
  transferable: false;
  purchasable: false;
  appreciating: false;
  personalData: false;
}

export function issueFoldKernelValueReceipt(input: {
  eventID: string;
  artifactDigest: string;
  outputKind: string;
  periodStart: string;
  periodEnd: string;
}): FoldKernelValueReceipt {
  requireMatch(input.eventID, /^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$/, "event ID");
  requireMatch(input.artifactDigest, /^[0-9a-f]{64}$/, "artifact digest");
  requireMatch(input.outputKind, /^[a-z0-9][a-z0-9._-]{0,79}$/, "output kind");
  requireDate(input.periodStart, "period start");
  requireDate(input.periodEnd, "period end");
  if (input.periodStart > input.periodEnd) throw new Error("period end precedes period start");

  const receipt: FoldKernelValueReceipt = {
    contractVersion: FOLDKERNEL_VALUE_RECEIPT_VERSION,
    digestAlgorithm: "keccak-256",
    receiptID: "",
    sourceSystem: "foldforge",
    ...input,
    state: "evidenced",
    valuationBasis: "none",
    currency: null,
    monetaryCounterpartCents: null,
    valuationEvidenceDigest: null,
    settlementEvidenceDigest: null,
    priorReceiptID: null,
    transferable: false,
    purchasable: false,
    appreciating: false,
    personalData: false,
  };
  receipt.receiptID = receiptDigest(receipt);
  return receipt;
}

function receiptDigest(receipt: FoldKernelValueReceipt): string {
  const bytes: number[] = [];
  for (const value of [receipt.contractVersion, receipt.digestAlgorithm, receipt.sourceSystem, receipt.eventID]) {
    pushText(bytes, value);
  }
  bytes.push(...hexBytes(receipt.artifactDigest));
  for (const value of [receipt.outputKind, receipt.periodStart, receipt.periodEnd, receipt.state, receipt.valuationBasis]) {
    pushText(bytes, value);
  }
  bytes.push(0, 0, 0, 0, 0);
  bytes.push(0, 0, 0, 0);
  return Array.from(keccak_256(Uint8Array.from(bytes)), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function pushText(target: number[], value: string): void {
  const encoded = new TextEncoder().encode(value);
  const size = encoded.length;
  target.push((size >>> 24) & 255, (size >>> 16) & 255, (size >>> 8) & 255, size & 255);
  target.push(...encoded);
}

function hexBytes(value: string): number[] {
  return value.match(/../g)?.map((byte) => Number.parseInt(byte, 16)) ?? [];
}

function requireMatch(value: string, pattern: RegExp, label: string): void {
  if (!pattern.test(value)) throw new Error(`invalid FoldKernel value receipt ${label}`);
}

function requireDate(value: string, label: string): void {
  requireMatch(value, /^\d{4}-\d{2}-\d{2}$/, label);
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error(`invalid FoldKernel value receipt ${label}`);
  }
}
