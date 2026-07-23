<p align="center">
  <img src="public/brand/foldforge-mark.svg" alt="FoldForge" width="240">
</p>

# FoldForge

FoldForge is a static Ethereum NFT archive with a monochrome, typography-led interface. Its primary archive lineage presents `mancel.eth` as the foundation and `zeropoet.eth` as its living continuation.

## Features

- ENS/address archive lookup
- Living holdings composition containing every visible work
- Equal square tiles ordered from darkest to lightest by average image luminance
- Grayscale archive presentation with original color revealed on hover or keyboard focus
- Typography-only collection index with no cover thumbnails or descriptions
- Repository-owned collection exclusions for the Mancel and Zeropoet archives
- Shareable collection and minted-work URLs
- NFT media with image, animation, video, and IPFS support
- Responsive WebP derivatives, lazy loading, and cached luminance analysis
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

The public archive uses contract-address exclusions committed in `app/collection-policy.ts`. Visibility is stable across browsers and devices, with no public curation controls or browser-storage dependency. Newly acquired collections appear automatically unless they are later added to the exclusion policy.

This is an exclusion policy rather than a fixed allowlist: collection and work totals continue to reflect current provider data after excluded contracts are removed.

## Holdings composition

The archive overview resolves every visible holding and arranges the works into an equal-cell square grid. Tile size does not imply importance, rarity, price, collection, or chronology.

Each image is reduced to a small grayscale sample and assigned an average perceived-luminance value. The grid sorts those values from dark to light; contract address and token ID provide deterministic tie-breaking. New holdings are analyzed by the same rule automatically.

Luminance values are cached locally as a performance optimization. The cache is keyed by owner, token, and media URL, so changed media is recalculated. It does not control collection visibility or alter Ethereum data.

Grid images are delivered as responsive 640px WebP derivatives through [wsrv.nl](https://images.weserv.nl/) and loaded lazily beyond the first visible rows. Small 24px derivatives are used for luminance analysis. Original token media remains available in the individual work view and through its source-file link.

When token-level media is absent, FoldForge displays an unavailable-media state rather than substituting the collection image.

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
| `npm run build` | Type-check and create the static export |
| `npm run preview` | Serve `out/` on port 4173 |
| `npm run lint` | Run ESLint |
| `npm test` | Run Vitest tests |

## Architecture

FoldForge uses Next.js static export and performs Alchemy, ENS, and image-derivative requests directly in the browser. It has no application server, database, account system, or cross-device preference synchronization.

Alchemy provides owner, contract, token, and cached metadata. `app/collection-policy.ts` applies repository-owned exclusions. `app/nft-data.ts` normalizes provider media and constructs responsive derivative URLs. `app/page.tsx` resolves the archive, computes or restores luminance values, and renders the composition, collection, and minted-work views.
