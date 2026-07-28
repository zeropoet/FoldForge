<p align="center">
  <img src="public/brand/foldforge-mark.svg" alt="FoldForge" width="240">
</p>

# FoldForge

FoldForge is a static Ethereum NFT archive and autonomous data composer for `zeropoet.eth`, presented through a monochrome, typography-led interface.

## Features

- ENS/address archive lookup
- Autonomous Ethereum NFT sound composition for `zeropoet.eth`
- Hidden luminosity analysis across every visible holding
- Color-and-composition signatures that sequence works by continuity and counterpoint
- Six evidence-derived phases with deterministic arrangement layering
- A single witnessed FoldForge voice spanning three octaves
- Consent-first audio with only Witness and Silence controls
- Reproducible SHA-256 evidence witnesses and local observation history
- Typography-only collection index with no cover thumbnails or descriptions
- Repository-owned collection exclusions for the Zeropoet archive
- Shareable collection and minted-work URLs
- NFT media with image, animation, video, and IPFS support
- Responsive WebP derivatives, lazy loading, and cached visual-signature analysis
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

The archive resolves every visible holding into a hidden visual signature. Alongside luminance, FoldForge measures circular hue, saturation, contrast, edge rhythm, bilateral balance, and visual center of mass. These are relational observations, not quality scores.

The signature composes in two directions: **Continuity** selects the nearest visual answer to the current work; **Counterpoint** selects the strongest available difference. In both cases contract address and token ID break exact ties. Evaluation therefore determines adjacency and motion without pretending to determine artistic value.

The current living grammar is **Composition I — Luminance Field** (`FF-COMP-0001`, version `1.0.0`). Each image is reduced to a small grayscale sample and assigned an average perceived-luminance value. The hidden field orders those values from dark to light; contract address and token ID provide deterministic tie-breaking. New holdings are analyzed by the same rule automatically.

Luminance values are cached locally as a performance optimization. The cache is keyed by owner, token, and media URL, so changed media is recalculated. It does not control collection visibility or alter Ethereum data.

Small 24px derivatives are used for luminance analysis. Original token media remains available in the individual work view and through its source-file link.

When token-level media is absent, FoldForge displays an unavailable-media state rather than substituting the collection image.

### Automatic archive admission

New holdings require no FoldForge code or grammar update. On each archive
observation, FoldForge discovers current holdings through Alchemy, accepts
processed or raw token-level media, and retrieves canonical metadata when the
provider has not finished indexing an image. Numeric Arweave routes and IPFS
metadata receive bounded alternate-gateway retries, and recovered metadata must
match the minted work before its image can enter visual analysis, the evidence
witness, or the sound composition.

This process cannot reconstruct media that was never published or repair an
on-chain token URI whose canonical and alternate routes contain no matching
metadata. Such a work remains visibly unavailable rather than borrowing another
token's or collection's image.

## Constitutional grammar

FoldForge's living scaffold is defined in:

- `constitution/foldforge-constitution.json` — identity, higher reference, primitives, authority, modalities, and release standard
- `constitution/foldforge-instrument-completion.json` — the declared completion boundary for the FoldForge instrument
- `grammar/composition.schema.json` — validation contract for composition grammars
- `grammar/composition-001-luminance.json` — canonical Composition I mapping and lineage requirements
- `grammar/composition-002-lexical.json` — recurring language derived from collection, token, and description evidence
- `grammar/composition-003-resonance.json` — consent-first unified sound mapping across a three-octave field
- `grammar/composition-004-visual-relations.json` — color and spatial measurements composed as continuity and counterpoint
- `grammar/composition-witness.schema.json` — export contract for reproducible archive-state witnesses
- `docs/constitutional-architecture.md` — evidence → grammar → composition architecture and revision boundary

Root Logos provides constitutional orientation, not a shared runtime or identity. Ethereum evidence remains prior to every FoldForge interpretation. A holdings change creates a new composition state; a change to measurement, ordering, interpretation, or presentation requires a new grammar version.

### Instrument completion

The FoldForge instrument is declared complete in `FF-MILESTONE-0001` at
Resonant Holdings `10.0.0`. Its one voice, nine arrangements, six phases,
evidence mappings, visual relations, signed displacement, memory, motifs,
consent, silence, and witness model constitute the completed form.

Completion is a living boundary, not a frozen recording. Ethereum holdings,
canonical media, archive memory, witnessed displacement, and state-derived
performance continue to change what the instrument sounds. New mechanisms do
not enter through ordinary feature development. Reopening the grammar requires
an evidenced failure or exceptional necessity, a new major version, preserved
rollback, and explicit review of the completion declaration.

The Composer Chamber gives the same holdings four governed compositions: Luminance Field, Lexical Field, Resonant Holdings, and Visual Relations. Language is extracted from recurring source terms and directly conducts its attributable works during Recurrence. Sound speaks through one synthesized FoldForge voice while independently mapping luminance to register and filtering, lexical and visual relations to event order, contract identity to harmonic character, token identity to rhythm, metadata density to envelope, and collection identity to a restrained stereo position. It never autoplays.

Resonant Holdings also traverses a witnessed, 64-step root-to-crown displacement
field derived from the current Root Logos Living Object geometry. The map does
not import the Living Object renderer or sovereign voice, and it does not
replace FoldForge's timbral contour. Instead, signed deviations from the form's
mean radius and density push filtering, duration, harmonic intensity, pulse, and
stereo pressure above or below the existing FoldForge baseline. Each work
retains its own evidence-derived pitch. The committed displacement records the
Root Logos revision, geometry generator, neutral geometry, point count, bounds,
and SHA-256 witness; regenerate it with `npm run build:displacement-map`.

The [monthly displacement-renewal workflow](.github/workflows/renew-root-logos-displacement.yml)
runs at 06:17 UTC on the first day of each month and may also be started
manually. It checks out the current Root Logos repository, rebuilds the map,
validates FoldForge, and commits only when the witnessed geometry has changed.
That focused commit triggers the normal Pages deployment. The workflow reuses
`ROOT_LOGOS_DISPATCH_TOKEN` for read-only checkout of Root Logos and the
workflow-scoped `GITHUB_TOKEN` for its FoldForge commit.

Resonant Holdings can traverse those fixed work-to-note relationships through nine deterministic arrangements: luminance ascent, luminance descent, recursive fold, visual continuity, visual counterpoint, lexical recurrence, collection bodies, contract/token lineage, and a witness-seeded scatter. These arrangements are no longer listener-controlled. The archive derives its own six-part macroform—Ground, Fold, Recurrence, Fracture, Convergence, and Silence—from its witness hash, visual-signature distribution, contrast, collection count, and collection diversity.

The listener can only begin (`Witness`) or end (`Silence`) the performance. Within the cycle, FoldForge selects one to three arrangement layers, assigns a state-derived event budget, advances every layer independently, normalizes their combined gain, enters a state-derived rest, and reforms. A holdings change produces a new witness hash and therefore a newly proportioned evolution without changing any individual work's evidence-derived sonic identity.

The Composer Chamber belongs exclusively to `zeropoet.eth`. Incoming archive routes
resolve to this identity; FoldForge no longer presents an alternate lineage archive.

When the evidence resolves, FoldForge calculates a deterministic SHA-256 state hash from its grammar versions, archive identity, included contracts, token identities, canonical media URLs, full visual signatures, and the witnessed Root Logos displacement map. Every expression shares that state hash. The interface exposes it with a JSON witness export, and up to 24 distinct states per owner are retained locally as reversible observation history.

### Archive memory and motifs

The current witness is compared with the most recent locally retained witness whose
state hash differs. Newly entered works receive bounded emphasis, removed works may
return once as low-gain echoes during Convergence, and works whose measured luminance
changed bend from their former frequency into the current one. When no prior witness
exists, FoldForge declares a first witnessed state and invents no history.

FoldForge also groups the current archive by evidence-derived frequency. The five
largest luminosity-note clusters become recurring motifs. Outside Ground, motifs
return at a state-derived interval and low gain without consuming phase events or
altering the identity of their source works.

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
After a successful deployment, FoldForge dispatches its exact published commit
to Root Logos for immediate connected-source witnessing. The publisher uses the
least-privilege `ROOT_LOGOS_DISPATCH_TOKEN` Actions secret, scoped only to Root
Logos repository contents; Root Logos's daily source check remains the recovery
path.

Every deployment also rebuilds
`public/root-logos-language-composition.json` directly from the current allowed
Ethereum holdings. The export carries the twelve strongest ranked lexical
recurrences, distinct-work counts, archive-state witness, grammar witness, and
its own sealed witness. A change in archive language therefore changes the
dispatch witness and deterministically recomposes Root Logos rather than
waiting for a manually copied keyword list.

The deployment runs on every `main` update and once each hour as a bounded
archive observation cadence. An unchanged lexical witness remains dormant in
Root Logos. A changed rank, term, recurrence count, trace count, or archive
witness propagates through the connected-source snapshot, cultivation,
Living Object geometry, sovereign voice, runtime, and public site.

1. Create a dedicated Alchemy app for this site.
2. Add its key at **Repository settings → Secrets and variables → Actions** as `NEXT_PUBLIC_ALCHEMY_API_KEY`.
3. Add a fine-grained Root Logos dispatch token as `ROOT_LOGOS_DISPATCH_TOKEN`.
4. Select **Repository settings → Pages → Build and deployment → Source → GitHub Actions**.
5. Push to `main`, or run the workflow manually from the Actions tab.

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

FoldForge uses Next.js static export and performs Alchemy, ENS, image-derivative, visual-signature analysis, witness generation, displacement sampling, and Web Audio composition directly in the browser. It has no application server, database, account system, or cross-device preference synchronization.

Alchemy provides owner, contract, token, and cached metadata. `app/collection-policy.ts` applies repository-owned exclusions. `app/nft-data.ts` normalizes provider media and constructs responsive derivative URLs. `app/page.tsx` resolves the archive and computes or restores visual signatures. `app/composition-witness.ts` seals archive evidence with the current displacement-map witness, while `app/composer-chamber.tsx` derives the lexical field, autonomous six-phase macroform, visual-relation arrangements, displacement field, and unified FoldForge voice.
