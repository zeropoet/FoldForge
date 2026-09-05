import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  archiveCandidate,
  digest,
  lexicalMeaningWitness,
  stabilizeArchiveObservation,
  stabilizeLexicalObservation,
} from "./language-composition-witness.mjs";

const root = resolve(import.meta.dirname, "..");
const outputPath = resolve(root, "public/root-logos-language-composition.json");
const observationPath = resolve(root, "public/root-logos-language-observation.json");
const grammarPath = resolve(root, "grammar/composition-002-lexical.json");
const apiKey = process.env.ALCHEMY_API_KEY || process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const owner = "zeropoet.eth";
const address = "0xBd4B3a05C6A585F226aFB1952ceDd8c410C52E8F";
const denylist = new Set([
  "0x1066d77f2b0ffe7a667e95ebc442866088ab1248",
  "0x57f1887a8bf19b14fc0df6fd9b2acc9af147ea85",
  "0x1e3b1154aedee78e10d67aa0001ab5c5b4d1143b",
]);
const directTokenUriContracts = new Set([
  "0x16bc29ea6e1b9390f70349bfb93ea87ffc9105fc",
  "0x716d8251ce9521657b6d36786e6f414e5c915895",
  "0x0d7fad8479768a7fd0618077b34f4b3d3aac02b7",
]);
const stopWords = new Set([
  "a", "an", "and", "are", "as", "at", "be", "but", "by", "for", "from", "in",
  "into", "is", "it", "not", "of", "on", "or", "that", "the", "this", "to",
  "what", "with", "without", "collection", "token", "untitled", "work"
]);

if (!apiKey) throw new Error("ALCHEMY_API_KEY is required.");

const readOptionalJson = async (path) => {
  if (!path) return null;
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return null;
  }
};
const normalizeMediaUrl = (value = "") => String(value)
  .replace(/^ar:\/\//i, "https://arweave.net/")
  .replace(/^ipfs:\/\//i, "https://ipfs.io/ipfs/");
const hydrateCanonicalEvidence = async (token) => {
  const contract = token.contract?.address?.toLowerCase() || "";
  if (!token.tokenUri) return token;
  let tokenUri = token.tokenUri;
  if (directTokenUriContracts.has(contract)) {
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
  }
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
const visible = await Promise.all(visibleRaw.map((token) => hydrateCanonicalEvidence(token)));
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
const previousExport = await readOptionalJson(process.env.FOLDFORGE_PREVIOUS_LANGUAGE_EXPORT);
const previousObservation = await readOptionalJson(process.env.FOLDFORGE_PREVIOUS_LANGUAGE_OBSERVATION);
const stabilized = stabilizeArchiveObservation({
  candidate: archiveCandidate(visible),
  previousArchive: previousExport?.archive,
  previousObservation: previousObservation?.archive || previousObservation,
});
const stabilizedLexical = stabilizeLexicalObservation({
  candidateTerms: ranked,
  previousTerms: previousExport?.terms,
  previousObservation: previousObservation?.lexical,
});
const exportPayload = {
  schema: "foldforge-language-composition-export/v1",
  source_id: "foldforge",
  source_url: `https://foldforge.zeropoet.xyz/?owner=${owner}`,
  grammar: {
    id: grammar.id,
    version: grammar.version,
    title: grammar.title,
    witness: digest(grammar)
  },
  archive: {
    owner,
    address: address.toLowerCase(),
    ...stabilized.archive,
    confirmation_policy: "two-consecutive-observations"
  },
  terms: stabilizedLexical.terms,
  claim: "These twelve terms are the strongest current recurrences in FoldForge's selected archive source language.",
  boundary: "Recurrence witnesses presence. It does not determine authorial intention, semantic truth, final interpretation, value, or authority."
};
const outputWithMeaning = {
  ...exportPayload,
  semantic_witness: lexicalMeaningWitness(exportPayload),
};
const output = { ...outputWithMeaning, witness: `sha256:${digest(outputWithMeaning)}` };
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
await writeFile(observationPath, `${JSON.stringify({
  schema: "foldforge-language-observation/v1",
  archive: stabilized.observation,
  lexical: stabilizedLexical.observation,
}, null, 2)}\n`);
process.stdout.write(`${output.witness}\n`);
