<p align="center">
  <img src="public/brand/foldforge-mark.svg" alt="Root Logos" width="240">
</p>

# FoldForge

FoldForge is a static, wallet-connected Ethereum NFT archive with a monochrome, typography-led interface. Its primary archive lineage presents `mancel.eth` as the foundation and `zeropoet.eth` as its living continuation.

## Features

- Ethereum wallet connection and ENS/address lookup
- Typography-only collection index with no cover thumbnails or descriptions
- Repository-owned collection exclusions for the Mancel and Zeropoet archives
- Shareable collection and minted-work URLs
- NFT media with image, animation, video, and IPFS support
- Minted metadata, traits, token URI, contract, Etherscan, and source-file links
- Fully static GitHub Pages deployment

## Local development

Requirements: Node.js 20 or later and an Alchemy API key.

```bash
npm ci
NEXT_PUBLIC_ALCHEMY_API_KEY=your_key npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Without a key, the interface remains available but live collection loading is disabled.

## Production preview

```bash
npm run build
npm run preview
```

Open [http://localhost:4173](http://localhost:4173). The build command creates a fully static export in `out/`, matching the artifact deployed to GitHub Pages.

## Collection curation

The public archive uses contract-address exclusions committed in `app/collection-policy.ts`. The initial snapshot excludes twenty contracts from `mancel.eth` and none from `zeropoet.eth`. Visibility is stable across browsers and devices, with no public curation controls or browser-storage dependency. Newly acquired collections appear automatically unless they are later added to the exclusion policy.

## Archive navigation

Collection and minted-work views use query-based URLs so deep links continue to work on static hosting:

```text
?owner=zeropoet.eth&collection=0x...
?owner=zeropoet.eth&collection=0x...&token=123
```

Minted-work records link to the contract and token on Etherscan and expose original token metadata and media files when the provider returns them.

## Deploy to GitHub Pages

Deployment is automated by [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) whenever `main` is updated.
The production deployment is published at [foldforge.xyz](https://foldforge.xyz).

1. Create a dedicated Alchemy app for this site.
2. Add its key at **Repository settings → Secrets and variables → Actions** as `NEXT_PUBLIC_ALCHEMY_API_KEY`.
3. Select **Repository settings → Pages → Build and deployment → Source → GitHub Actions**.
4. Push to `main`, or run the workflow manually from the Actions tab.

The Next.js configuration publishes from the domain root when `CUSTOM_DOMAIN` is set and otherwise derives the repository path for standard GitHub Pages hosting.

> [!IMPORTANT]
> GitHub Pages is static. Variables prefixed with `NEXT_PUBLIC_` are embedded in the browser bundle and are not secret at runtime. Use a dedicated key with domain allowlists, conservative quotas, and no privileged access.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Lint types and create the static export |
| `npm run preview` | Serve `out/` on port 4173 |
| `npm run lint` | Run ESLint |
| `npm test` | Run Vitest tests |

## Architecture

FoldForge uses Next.js static export and performs Alchemy and ENS requests directly in the browser. It has no application server, database, account system, or cross-device preference synchronization.
