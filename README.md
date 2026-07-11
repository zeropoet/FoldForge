# FoldForge

FoldForge is a static, wallet-connected NFT collection gallery. It opens with `zeropoet.eth` as an editable default; enter any Ethereum address or ENS name—or connect a browser wallet—to group owned NFTs into a responsive collection grid across Ethereum, Base, Polygon, and Arbitrum.

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

## Deploy to GitHub Pages

Deployment is automated by [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) whenever `main` is updated.

1. Create a dedicated Alchemy app for this site.
2. Add its key at **Repository settings → Secrets and variables → Actions** as `NEXT_PUBLIC_ALCHEMY_API_KEY`.
3. Select **Repository settings → Pages → Build and deployment → Source → GitHub Actions**.
4. Push to `main`, or run the workflow manually from the Actions tab.

The Next.js configuration derives the repository name in GitHub Actions and applies the correct `basePath` and asset prefix automatically.

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

## Current scope

The GitHub Pages build provides wallet connection, ENS/address import, network selection, shareable wallet query URLs, and the collection grid. Collection and individual NFT detail views are not included because the earlier implementation depended on server-rendered dynamic routes, which GitHub Pages cannot execute.
