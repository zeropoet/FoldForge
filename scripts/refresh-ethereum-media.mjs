const apiKey = process.env.ALCHEMY_API_KEY || process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const owner = process.env.FOLDFORGE_ARCHIVE_OWNER || "zeropoet.eth";
const network = process.env.FOLDFORGE_NETWORK || "eth-mainnet";
const concurrency = 4;

if (!apiKey) throw new Error("ALCHEMY_API_KEY or NEXT_PUBLIC_ALCHEMY_API_KEY is required.");

const endpoint = (method) => `https://${network}.g.alchemy.com/nft/v3/${apiKey}/${method}`;
const holdings = [];
let pageKey;

do {
  const url = new URL(endpoint("getNFTsForOwner"));
  url.searchParams.set("owner", owner);
  url.searchParams.set("withMetadata", "false");
  url.searchParams.set("pageSize", "100");
  if (pageKey) url.searchParams.set("pageKey", pageKey);

  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`Alchemy holdings request failed (${response.status}).`);
  const payload = await response.json();
  holdings.push(...(payload.ownedNfts || []));
  pageKey = payload.pageKey;
} while (pageKey && holdings.length < 1000);

const tokens = holdings
  .map((token) => ({
    contractAddress: token.contractAddress || token.contract?.address || "",
    tokenId: token.tokenId || "",
  }))
  .filter((token) => token.contractAddress && token.tokenId);

let cursor = 0;
let queued = 0;
let alreadyFresh = 0;
const failures = [];

async function worker() {
  while (cursor < tokens.length) {
    const token = tokens[cursor++];
    try {
      const response = await fetch(endpoint("refreshNftMetadata"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(token),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      if (String(result.status || "").toLocaleLowerCase() === "queued") queued += 1;
      else alreadyFresh += 1;
    } catch (error) {
      failures.push({ ...token, error: error instanceof Error ? error.message : String(error) });
    }
  }
}

await Promise.all(Array.from({ length: concurrency }, () => worker()));

console.log(`Ethereum media refresh: ${tokens.length} held works / ${queued} queued / ${alreadyFresh} already current / ${failures.length} failed.`);
if (failures.length) {
  console.error(JSON.stringify(failures, null, 2));
  process.exitCode = 1;
}
