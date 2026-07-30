import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const outputPath = resolve(root, "public/root-logos-language-composition.json");
const grammarPath = resolve(root, "grammar/composition-002-lexical.json");
const apiKey = process.env.ALCHEMY_API_KEY || process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const owner = "zeropoet.eth";
const address = "0xBd4B3a05C6A585F226aFB1952ceDd8c410C52E8F";
const denylist = new Set([
  "0x1066d77f2b0ffe7a667e95ebc442866088ab1248",
  "0x57f1887a8bf19b14fc0df6fd9b2acc9af147ea85",
  "0x1e3b1154aedee78e10d67aa0001ab5c5b4d1143b",
]);
const canonicalMetadataContracts = new Set(["0x16bc29ea6e1b9390f70349bfb93ea87ffc9105fc"]);
const stopWords = new Set([
  "a", "an", "and", "are", "as", "at", "be", "but", "by", "for", "from", "in",
  "into", "is", "it", "not", "of", "on", "or", "that", "the", "this", "to",
  "what", "with", "without", "collection", "token", "untitled", "work"
]);

if (!apiKey) throw new Error("ALCHEMY_API_KEY is required.");

const stable = (value) => {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
};
const digest = (value) => createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
const normalizeMediaUrl = (value = "") => String(value)
  .replace(/^ar:\/\//i, "https://arweave.net/")
  .replace(/^ipfs:\/\//i, "https://ipfs.io/ipfs/");
const hydrateCanonicalEvidence = async (token) => {
  const contract = token.contract?.address?.toLowerCase() || "";
  if (!canonicalMetadataContracts.has(contract) || !token.tokenUri) return token;
  let tokenUri = token.tokenUri;
  try {
    const rpc = await fetch(`https://eth-mainnet.g.alchemy.com/v2/${apiKey}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Number(token.tokenId),
        method: "eth_call",
        params: [{
          to: contract,
          data: `0xc87b56dd${BigInt(token.tokenId).toString(16).padStart(64, "0")}`
        }, "latest"]
      })
    }).then((response) => response.json());
    if (rpc.result) {
      const bytes = Buffer.from(rpc.result.slice(2), "hex");
      const offset = Number(BigInt(`0x${bytes.subarray(0, 32).toString("hex")}`));
      const length = Number(BigInt(`0x${bytes.subarray(offset, offset + 32).toString("hex")}`));
      tokenUri = bytes.subarray(offset + 32, offset + 32 + length).toString();
    }
  } catch {}
  const url = normalizeMediaUrl(tokenUri);
  if (!/^https?:\/\//i.test(url)) return token;
  try {
    const response = await fetch(url, { headers: { accept: "application/json" } });
    if (!response.ok) return token;
    const metadata = await response.json();
    return {
      ...token,
      tokenUri,
      name: metadata.name || token.name,
      description: metadata.description || token.description || "",
      image: metadata.image || metadata.image_url
        ? { ...token.image, originalUrl: normalizeMediaUrl(metadata.image_url || metadata.image) }
        : token.image,
      raw: { ...token.raw, metadata: { ...token.raw?.metadata, ...metadata } }
    };
  } catch {
    return token;
  }
};

const endpoint = new URL(`https://eth-mainnet.g.alchemy.com/nft/v3/${apiKey}/getNFTsForOwner`);
endpoint.searchParams.set("owner", address);
endpoint.searchParams.set("withMetadata", "true");
endpoint.searchParams.set("pageSize", "100");

const tokens = [];
let pageKey;
do {
  if (pageKey) endpoint.searchParams.set("pageKey", pageKey);
  const response = await fetch(endpoint, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`Alchemy returned ${response.status}.`);
  const payload = await response.json();
  tokens.push(...(payload.ownedNfts || []));
  pageKey = payload.pageKey;
} while (pageKey && tokens.length < 600);

const visibleRaw = tokens.filter((token) => {
  const contract = token.contract?.address?.toLowerCase();
  return contract && !denylist.has(contract);
});
const visible = await Promise.all(visibleRaw.map((token) =>
  canonicalMetadataContracts.has(token.contract?.address?.toLowerCase() || "")
    ? hydrateCanonicalEvidence(token)
    : token
));
const terms = new Map();
for (const token of visible) {
  const contract = token.contract?.address?.toLowerCase() || "unknown";
  const tokenId = token.tokenId || "unknown";
  const key = `${contract}:${tokenId}`;
  const collection = token.collection?.name
    || token.contract?.openSeaMetadata?.collectionName
    || token.contract?.name
    || "Unresolved collection";
  const source = `${token.name || `Token ${tokenId}`} ${token.description || ""} ${collection}`;
  const words = source.toLocaleLowerCase().match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu) || [];
  for (const word of new Set(words)) {
    if (word.length < 3 || stopWords.has(word) || /^\d+$/.test(word)) continue;
    const sources = terms.get(word) || new Set();
    sources.add(key);
    terms.set(word, sources);
  }
}

const ranked = [...terms.entries()]
  .map(([term, sources]) => ({ term, works: sources.size, traces: sources.size }))
  .sort((left, right) => right.works - left.works || left.term.localeCompare(right.term))
  .slice(0, 12)
  .map((term, index) => ({ rank: index + 1, ...term }));
if (ranked.length !== 12) throw new Error(`Expected twelve lexical terms; received ${ranked.length}.`);

const grammar = JSON.parse(await readFile(grammarPath, "utf8"));
const stateEvidence = visible.map((token) => ({
  contract: token.contract?.address?.toLowerCase() || "",
  token_id: token.tokenId || "",
  name: token.name || "",
  description: token.description || "",
  collection: token.collection?.name
    || token.contract?.openSeaMetadata?.collectionName
    || token.contract?.name
    || ""
})).sort((left, right) =>
  left.contract.localeCompare(right.contract) || left.token_id.localeCompare(right.token_id)
);
const exportPayload = {
  schema: "foldforge-language-composition-export/v1",
  source_id: "foldforge",
  source_url: `https://foldforge.xyz/?owner=${owner}`,
  grammar: {
    id: grammar.id,
    version: grammar.version,
    title: grammar.title,
    witness: digest(grammar)
  },
  archive: {
    owner,
    address: address.toLowerCase(),
    source_works: visible.length,
    state_witness: `sha256:${digest(stateEvidence)}`
  },
  terms: ranked,
  claim: "These twelve terms are the strongest current recurrences in FoldForge's selected archive source language.",
  boundary: "Recurrence witnesses presence. It does not determine authorial intention, semantic truth, final interpretation, value, or authority."
};
const output = { ...exportPayload, witness: `sha256:${digest(exportPayload)}` };
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
process.stdout.write(`${output.witness}\n`);
