import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

const apiKey = process.env.ALCHEMY_API_KEY || process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const owners = (process.env.FOLDFORGE_ARCHIVE_OWNERS || process.env.FOLDFORGE_ARCHIVE_OWNER || "zeropoet.eth,rootlogos.eth")
  .split(",")
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);
const network = process.env.FOLDFORGE_NETWORK || "eth-mainnet";
const root = resolve("public/ethereum-archive");
const indexPath = join(root, "index.json");
const soundArchivePath = resolve("public/record-sound-archive.json");
const maxBytes = 99_000_000;
const alwaysHydrateContracts = new Set([
  "0x16bc29ea6e1b9390f70349bfb93ea87ffc9105fc", // FLDFRG
  "0x716d8251ce9521657b6d36786e6f414e5c915895", // SOVE
]);

if (!apiKey) throw new Error("ALCHEMY_API_KEY or NEXT_PUBLIC_ALCHEMY_API_KEY is required.");

const normalize = (value = "") => {
  const url = String(value || "").trim();
  if (url.startsWith("ipfs://ipfs/")) return `https://ipfs.io/ipfs/${url.slice(12)}`;
  if (url.startsWith("ipfs://")) return `https://ipfs.io/ipfs/${url.slice(7)}`;
  if (url.startsWith("ipns://")) return `https://ipfs.io/ipns/${url.slice(7)}`;
  if (url.startsWith("ar://")) return `https://arweave.net/${url.slice(5)}`;
  return url;
};
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const stableNumber = (value) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};
const safeTokenId = (value) => encodeURIComponent(String(value)).replaceAll("%", "_");
const endpoint = (method) => `https://${network}.g.alchemy.com/nft/v3/${apiKey}/${method}`;
const rpcEndpoint = `https://${network}.g.alchemy.com/v2/${apiKey}`;

async function canonicalTokenUri(contract, tokenId) {
  const data = `0xc87b56dd${BigInt(tokenId).toString(16).padStart(64, "0")}`;
  const response = await fetch(rpcEndpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to: contract, data }, "latest"] }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`tokenURI call failed (${response.status}) for ${contract}:${tokenId}`);
  const payload = await response.json();
  const encoded = String(payload.result || "").replace(/^0x/, "");
  if (encoded.length < 128) throw new Error(`tokenURI call returned invalid data for ${contract}:${tokenId}`);
  const length = Number.parseInt(encoded.slice(64, 128), 16);
  return Buffer.from(encoded.slice(128, 128 + length * 2), "hex").toString("utf8");
}

async function readPrevious() {
  try { return JSON.parse(await readFile(indexPath, "utf8")); } catch { return { tokens: [] }; }
}

async function fetchHoldings(owner) {
  const values = [];
  let pageKey;
  do {
    const url = new URL(endpoint("getNFTsForOwner"));
    url.searchParams.set("owner", owner);
    url.searchParams.set("withMetadata", "true");
    url.searchParams.set("pageSize", "100");
    if (pageKey) url.searchParams.set("pageKey", pageKey);
    const response = await fetch(url, { headers: { accept: "application/json" } });
    if (!response.ok) throw new Error(`Ethereum archive request failed (${response.status}).`);
    const payload = await response.json();
    values.push(...(payload.ownedNfts || []));
    pageKey = payload.pageKey;
  } while (pageKey && values.length < 1000);
  return values;
}

async function hydrateCanonicalToken(token) {
  const hasMedia = imageSources(token).length || animationSources(token).length;
  const placeholder = !token.name || /^#?\s*\d+$/.test(token.name) || /^token\s+#?\d+$/i.test(token.name);
  const contract = (token.contract?.address || token.contractAddress || "").toLowerCase();
  if (!alwaysHydrateContracts.has(contract) && hasMedia && !placeholder) return token;
  const metadataUrl = normalize(token.tokenUri || token.raw?.tokenUri || "");
  if (!/^https?:\/\//i.test(metadataUrl)) return token;
  let failure;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(metadataUrl, { headers: { accept: "application/json" }, redirect: "follow", signal: AbortSignal.timeout(60_000) });
      if (!response.ok) throw new Error(`Metadata request failed (${response.status}) for ${metadataUrl}`);
      const metadata = await response.json();
      return {
        ...token,
        name: metadata.name || token.name,
        description: metadata.description || token.description || "",
        image: metadata.image || metadata.image_url ? { ...token.image, originalUrl: normalize(metadata.image_url || metadata.image) } : token.image,
        animation: metadata.animation_url ? { ...token.animation, originalUrl: normalize(metadata.animation_url) } : token.animation,
        raw: { ...token.raw, metadata: { ...token.raw?.metadata, ...metadata } },
      };
    } catch (error) {
      failure = error;
      if (attempt < 4) await new Promise((resolveDelay) => setTimeout(resolveDelay, attempt * 1_000));
    }
  }
  return { ...token, archiveMetadataError: failure instanceof Error ? failure.message : String(failure) };
}

const candidates = (...values) => [...new Set(values.map(normalize).filter(Boolean))];
const imageSources = (token) => candidates(token.image?.originalUrl, token.raw?.metadata?.image_url, token.raw?.metadata?.image, token.image?.cachedUrl, token.image?.pngUrl, token.image?.thumbnailUrl);
const animationSources = (token) => candidates(token.animation?.originalUrl, token.raw?.metadata?.animation_url, token.animation?.cachedUrl);

function mediaExtension(url, contentType) {
  const type = (contentType || "").split(";")[0].toLowerCase();
  const byType = { "image/jpeg": ".jpg", "image/png": ".png", "image/gif": ".gif", "image/webp": ".webp", "image/svg+xml": ".svg", "video/mp4": ".mp4", "video/webm": ".webm", "audio/mpeg": ".mp3", "audio/wav": ".wav", "audio/ogg": ".ogg" };
  const pathnameExtension = extname(new URL(url).pathname).toLowerCase();
  return byType[type] || (/^\.[a-z0-9]{2,5}$/.test(pathnameExtension) ? pathnameExtension : ".bin");
}

async function archiveMedia(url, tokenDirectory, stem) {
  if (!/^https?:\/\//i.test(url)) return null;
  let failure;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(120_000) });
      if (!response.ok) throw new Error(`Media request failed (${response.status}) for ${url}`);
      const declared = Number(response.headers.get("content-length") || 0);
      if (declared > maxBytes) throw new Error(`Media exceeds the repository file limit (${declared} bytes): ${url}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length > maxBytes) throw new Error(`Media exceeds the repository file limit (${bytes.length} bytes): ${url}`);
      const extension = mediaExtension(url, response.headers.get("content-type"));
      const file = `${stem}${extension}`;
      await writeFile(join(tokenDirectory, file), bytes);
      return { file, bytes: bytes.length, sha256: sha256(bytes), media_type: response.headers.get("content-type") || "application/octet-stream" };
    } catch (error) {
      failure = error;
    }
    if (attempt < 4) await new Promise((resolveDelay) => setTimeout(resolveDelay, attempt * 1_000));
  }
  throw failure || new Error(`Media request failed for ${url}`);
}

async function archiveFirst(urls, tokenDirectory, stem) {
  const errors = [];
  for (const url of urls) {
    try {
      return { asset: await archiveMedia(url, tokenDirectory, stem), source: url, errors };
    } catch (error) {
      errors.push({ source: url, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return { asset: null, source: urls[0] || "", errors };
}

const previous = await readPrevious();
const priorByKey = new Map((previous.tokens || []).map((token) => [`${token.contract}:${token.token_id}`, token]));
const holdingsByOwner = await Promise.all(owners.map(async (owner) => ({ owner, holdings: await fetchHoldings(owner) })));
const incompleteOwners = new Set(holdingsByOwner.flatMap(({ owner, holdings }) => {
  const priorCount = (previous.tokens || []).filter((token) => token.holding_state === "current" && token.owners?.includes(owner)).length;
  return priorCount >= 50 && holdings.length < priorCount * 0.5 ? [owner] : [];
}));
const holdingOwners = new Map();
const providerTokens = new Map();
for (const { owner, holdings } of holdingsByOwner) {
  for (const token of holdings) {
    const contract = (token.contract?.address || token.contractAddress || "").toLowerCase();
    const tokenId = String(token.tokenId || "");
    if (!contract || !tokenId) continue;
    const key = `${contract}:${tokenId}`;
    const tokenOwners = holdingOwners.get(key) || new Set();
    tokenOwners.add(owner);
    holdingOwners.set(key, tokenOwners);
    if (!providerTokens.has(key)) providerTokens.set(key, token);
  }
}
const tokens = [];
const contracts = new Map();
const observedKeys = new Set();
const syncObservedAt = new Date().toISOString();
let added = 0;
let updated = 0;
let unchanged = 0;
let holdingChanges = 0;

for (const [providerKey, providerToken] of providerTokens) {
  const providerContract = (providerToken.contract?.address || providerToken.contractAddress || "").toLowerCase();
  const providerTokenId = String(providerToken.tokenId || "");
  const authoritativeToken = alwaysHydrateContracts.has(providerContract)
    ? { ...providerToken, tokenUri: await canonicalTokenUri(providerContract, providerTokenId) }
    : providerToken;
  const token = await hydrateCanonicalToken(authoritativeToken);
  const contract = (token.contract?.address || token.contractAddress || "").toLowerCase();
  const tokenId = String(token.tokenId || "");
  if (!contract || !tokenId) continue;
  observedKeys.add(`${contract}:${tokenId}`);
  const contractDirectory = join(root, "contracts", contract);
  const tokenDirectory = join(contractDirectory, "tokens", safeTokenId(tokenId));
  const canonicalImages = imageSources(token);
  const canonicalAnimations = animationSources(token);
  const evidence = {
    contract,
    token_id: tokenId,
    token_uri: token.tokenUri || "",
    name: token.name || `Token ${tokenId}`,
    description: token.description || "",
    token_type: token.tokenType || token.contract?.tokenType || "NFT",
    attributes: token.raw?.metadata?.attributes || [],
    image_sources: canonicalImages,
    animation_sources: canonicalAnimations,
  };
  const evidenceSha256 = sha256(JSON.stringify(evidence));
  const prior = priorByKey.get(`${contract}:${tokenId}`);
  await mkdir(tokenDirectory, { recursive: true });
  let media = prior?.media || null;
  let animation = prior?.animation || null;
  let archiveErrors = prior?.archive_errors || [];
  const unchangedEvidence = prior?.evidence_sha256 === evidenceSha256;
  const nextOwners = [...(holdingOwners.get(providerKey) || [])].sort();
  const ownersChanged = JSON.stringify(prior?.owners || (previous.owner ? [previous.owner] : [])) !== JSON.stringify(nextOwners);
  let recordChanged = !prior || !unchangedEvidence || ownersChanged;
  if (!unchangedEvidence || !media) {
    const archivedImage = await archiveFirst(canonicalImages, tokenDirectory, "image");
    if (archivedImage.asset?.sha256 && archivedImage.asset.sha256 !== prior?.media?.sha256) recordChanged = true;
    media = archivedImage.asset || media;
    const archivedAnimation = canonicalAnimations[0] && canonicalAnimations[0] === archivedImage.source
      ? { asset: media, errors: [] }
      : await archiveFirst(canonicalAnimations, tokenDirectory, "animation");
    animation = archivedAnimation.asset || animation;
    if (archivedAnimation.asset?.sha256 && archivedAnimation.asset.sha256 !== prior?.animation?.sha256) recordChanged = true;
    if (recordChanged) archiveErrors = [...archivedImage.errors, ...archivedAnimation.errors];
  }
  if (!prior) added += 1;
  else if (recordChanged) updated += 1;
  else unchanged += 1;
  const publicDirectory = `/ethereum-archive/contracts/${contract}/tokens/${safeTokenId(tokenId)}`;
  const record = {
    ...evidence,
    evidence_sha256: evidenceSha256,
    metadata_path: `${publicDirectory}/metadata.json`,
    media: media ? { ...media, path: `${publicDirectory}/${media.file}` } : null,
    animation: animation ? { ...animation, path: `${publicDirectory}/${animation.file}` } : null,
    archive_errors: archiveErrors,
    owners: nextOwners,
    observed_at: unchangedEvidence && prior?.holding_state !== "unobserved" ? prior.observed_at : syncObservedAt,
    holding_state: "current",
  };
  if (recordChanged || prior?.holding_state === "unobserved") {
    await writeFile(join(tokenDirectory, "metadata.json"), `${JSON.stringify({ schema: "foldforge-ethereum-work/v1", ...record, provider_metadata: token }, null, 2)}\n`);
  }
  if (prior?.holding_state === "unobserved") holdingChanges += 1;
  tokens.push(record);
  const collection = contracts.get(contract) || {
    address: contract,
    name: token.collection?.name || token.contract?.openSeaMetadata?.collectionName || token.contract?.name || `Collection ${contract.slice(2, 8).toUpperCase()}`,
    symbol: token.contract?.symbol || "",
    description: token.contract?.openSeaMetadata?.description || "",
    total_supply: token.contract?.totalSupply || "",
    token_type: token.contract?.tokenType || token.tokenType || "NFT",
    token_ids: [],
    image: "",
    owners: [],
  };
  collection.token_ids.push(tokenId);
  collection.owners = [...new Set([...collection.owners, ...record.owners])].sort();
  if (!collection.image && record.media?.path && record.media.media_type.startsWith("image/")) collection.image = record.media.path;
  contracts.set(contract, collection);
}

for (const prior of previous.tokens || []) {
  if (observedKeys.has(`${prior.contract}:${prior.token_id}`)) continue;
  const observationIncomplete = prior.owners?.some((owner) => incompleteOwners.has(owner));
  if (observationIncomplete) {
    tokens.push(prior);
    continue;
  }
  if (prior.holding_state !== "unobserved") holdingChanges += 1;
  tokens.push({ ...prior, owners: prior.owners || (previous.owner ? [previous.owner] : []), holding_state: "unobserved" });
}

for (const prior of previous.contracts || []) {
  const current = contracts.get(prior.address);
  if (!current) {
    contracts.set(prior.address, prior);
    continue;
  }
  current.token_ids = [...new Set([...current.token_ids, ...prior.token_ids])];
  current.owners = [...new Set([...(current.owners || []), ...(prior.owners || [])])].sort();
}

for (const contract of contracts.values()) {
  const contractDirectory = join(root, "contracts", contract.address);
  await mkdir(contractDirectory, { recursive: true });
  await writeFile(join(contractDirectory, "contract.json"), `${JSON.stringify({ schema: "foldforge-ethereum-contract/v1", ...contract }, null, 2)}\n`);
}

tokens.sort((a, b) => a.contract.localeCompare(b.contract) || a.token_id.localeCompare(b.token_id, undefined, { numeric: true }));
const index = {
  schema: "foldforge-ethereum-archive/v2",
  owner: owners.join(" + "),
  owners: owners.map((name) => {
    const ownerTokens = tokens.filter((token) => token.owners?.includes(name));
    const observedTokens = ownerTokens.filter((token) => token.holding_state === "current");
    const ownerContracts = new Set(ownerTokens.map((token) => token.contract));
    return {
      name,
      contract_count: ownerContracts.size,
      work_count: ownerTokens.length,
      observed_work_count: observedTokens.length,
      witness: `sha256:${sha256(JSON.stringify(ownerTokens.map(({ contract, token_id, evidence_sha256 }) => ({ contract, token_id, evidence_sha256 }))))}`,
    };
  }),
  network,
  observed_at: added || updated || holdingChanges || !previous.observed_at ? syncObservedAt : previous.observed_at,
  policy: {
    authority: "Ethereum remains provenance authority; this repository snapshot is a durable read fallback.",
    admission: "Each sync ingests newly held works and refreshes metadata/media only when its evidence fingerprint changes.",
    deletion: "A missing network observation never deletes an archived work automatically.",
  },
  contract_count: contracts.size,
  work_count: tokens.length,
  contracts: [...contracts.values()],
  tokens,
  witness: `sha256:${sha256(JSON.stringify(tokens.map(({ contract, token_id, evidence_sha256, media, animation }) => ({ contract, token_id, evidence_sha256, media_sha256: media?.sha256 || null, animation_sha256: animation?.sha256 || null }))))}`,
};
await mkdir(root, { recursive: true });
const temporary = `${indexPath}.tmp`;
await writeFile(temporary, `${JSON.stringify(index, null, 2)}\n`);
await rename(temporary, indexPath);
const sourceValue = (source) => {
  const seed = stableNumber(source.witness);
  const density = source.work_count / Math.max(source.contract_count, 1);
  return {
    frequency: 55 * 2 ** (((seed % 18) + Math.min(12, Math.round(density / 2))) / 12),
    cutoff: 720 + (seed % 2200) + source.contract_count * 86,
    harmonic: 1.25 + ((seed >>> 7) % 7) / 4,
  };
};
const sourceStates = index.owners.map((source) => ({ ...source, ...sourceValue(source) }));
if (sourceStates.length > 1 && Math.abs(sourceStates[0].frequency - sourceStates[1].frequency) < 0.001) {
  sourceStates[1] = { ...sourceStates[1], frequency: sourceStates[1].frequency * 2 ** (1 / 12) };
}
const [firstSource, secondSource] = sourceStates;
const relationRoot = Math.sqrt(firstSource.frequency * secondSource.frequency);
const soundArchive = JSON.parse(await readFile(soundArchivePath, "utf8"));
const sharedEntry = {
  id: "foldforge-dual-source-field",
  title: "zeropoet.eth × rootlogos.eth Composite",
  branch: "FoldForge",
  kind: "canonical composite of two Ethereum holdings states",
  availability: "public instrument",
  source: { repository: "zeropoet/FoldForge", path: "app/composer-chamber", url: "https://foldforge.zeropoet.xyz/composer-chamber" },
  witness: `sha256:${sha256(sourceStates.map((source) => source.witness).join(":"))}`,
  sources: sourceStates.map((source) => ({ owner: source.name, workCount: source.work_count, observedWorkCount: source.observed_work_count, contractCount: source.contract_count, witness: source.witness })),
  sound: {
    frequenciesHz: [firstSource.frequency, secondSource.frequency, relationRoot, relationRoot * ((firstSource.harmonic + secondSource.harmonic) / 2)].map((value) => Number(value.toFixed(3))),
    waves: ["sine", "triangle", "sawtooth", "triangle"],
    cutoffHz: Math.round(Math.sqrt(firstSource.cutoff * secondSource.cutoff)),
    renderer: {
      engine: "continuous-voice/v1",
      masterGain: 0.2,
      fadeInSeconds: 1.8,
      fieldFilter: { type: "bandpass", frequency: Math.round(Math.sqrt(firstSource.cutoff * secondSource.cutoff)), Q: 2.4 },
      partialGains: [0.5, 0.5, 0.56, 0.2],
      gainLfo: { base: 0.86, depth: 0.08, angularRate: 0.21 },
      composite: { mode: "simultaneous-sum", sources: 2, phase: "shared", cadence: "shared" },
      stereo: "center",
    },
  },
};
soundArchive.entries = [...soundArchive.entries.filter((entry) => entry.id !== sharedEntry.id), sharedEntry];
await writeFile(soundArchivePath, `${JSON.stringify(soundArchive, null, 2)}\n`);
console.log(`Ethereum archive sync: ${owners.length} sources / ${tokens.length} works / ${contracts.size} contracts / ${added} added / ${updated} updated / ${holdingChanges} holding changes / ${unchanged} unchanged.`);
