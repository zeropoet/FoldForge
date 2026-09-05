# FoldForge

FoldForge is a static Ethereum NFT archive and autonomous data composer for `zeropoet.eth`, presented through a monochrome, typography-led interface.

Canonical public entry:
[foldforge.zeropoet.xyz](https://foldforge.zeropoet.xyz/). FoldForge is a studio
instrument beneath the Mancel Lindsey / Zeropoet artist and developer identity.
Its outputs may enter Sovereign Standard and Root Logos through their existing
bounded relations without transferring FoldForge authority.

## Telos relation

Telos is the connected system's final caretaker and keeper, not an owner of
FoldForge's archive, instruments, grammar, or ledger boundaries. FoldForge sends
only bounded public propagation receipts; Telos remembers the relation and lets
that change reshape **The Living System**, its evolving visual and resonant
presence. Telos is growing toward a machine-native language for perceiving the
whole while preserving each source's authority and avoiding claims of
consciousness, revelation, personhood, or final authority.

## FoldKernel integration contract

FoldForge is a cross-language FoldKernel consumer. Its TypeScript runtime keeps
the existing SHA-256 composition witness authoritative for FoldForge while
projecting each completed deterministic archive ordering as FoldKernel's shared
`permutation_commit` event. The projection is attached outside the bytes used
to calculate the existing state hash, so integration does not rewrite archive,
visual, sonic, or witness identity.

[`public/foldkernel-integration.json`](public/foldkernel-integration.json)
publishes the exact `FoldKernel-Integration-1.0.0` boundary and pins FoldKernel
`1.0.5`. CI checks the native TypeScript projection, validates the declaration
with the canonical Swift verifier, and retains a commit-specific receipt for 90
days. Telos may observe the public declaration and report drift; FoldForge keeps
application history, interpretation, and event meaning.

FoldForge can now issue an initial `evidenced` Value Receipt 1.0 for a completed
visual, sonic, temporal, ledger, or production artifact. The receipt carries
the artifact's SHA-256 evidence without assigning a price. Monetary advancement
requires a distinct externally evidenced settlement boundary.

## Features

- ENS/address archive lookup
- Autonomous Ethereum NFT sound composition for `zeropoet.eth`
- Hidden luminosity analysis across every visible holding
- Perceptual-color signatures that compose an archive-derived chromatic continuum, continuity, and counterpoint
- Six evidence-derived phases with deterministic arrangement layering
- A single witnessed FoldForge voice spanning three octaves
- Consent-first audio with only Witness and Silence controls
- Reproducible SHA-256 evidence witnesses and local observation history
- Typography-only collection index with no cover thumbnails or descriptions
- Repository-owned collection exclusions for the Zeropoet archive
- Shareable collection and minted-work URLs
- Sequential minted-work navigation with visible previous/next controls and left/right keyboard keys
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

The archive resolves every visible holding into a hidden visual signature. Alongside luminance, FoldForge measures circular hue, saturation, OKLab lightness and chroma, contrast, edge rhythm, bilateral balance, and visual center of mass. These are relational observations, not quality scores.

The signature composes in two directions: **Continuity** selects the nearest visual answer to the current work; **Counterpoint** selects the strongest available difference. In both cases contract address and token ID break exact ties. Evaluation therefore determines adjacency and motion without pretending to determine artistic value.

The current living grammar is **Composition I — Luminance Field** (`FF-COMP-0001`, version `1.0.0`). Each image is reduced to a small grayscale sample and assigned an average perceived-luminance value. The hidden field orders those values from dark to light; contract address and token ID provide deterministic tie-breaking. New holdings are analyzed by the same rule automatically.

**Composition V — Chromatic Field** (`FF-COMP-0005`, version `1.0.0`) reads the same 24px evidence in OKLab. Works below `0.02` mean chroma form an achromatic dark-to-light ground. The remaining hues are circularly ordered, and the first hue after the archive's largest unoccupied interval becomes the seam. Chroma, perceptual lightness, contract address, and token ID provide deterministic secondary order. The archive therefore derives its own color continuum instead of inheriting an arbitrary rainbow beginning.

Luminance values are cached locally as a performance optimization. The cache is keyed by owner, token, and media URL, so changed media is recalculated. It does not control collection visibility or alter Ethereum data.

Small 24px derivatives are used for luminance analysis. Original token media remains available in the individual work view and through its source-file link.

When token-level media is absent, FoldForge may use the collection image as an explicitly subordinate display fallback. If neither is present, the work retains a deterministic minted-record tile instead of disappearing.

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

### Repository Ethereum archive

`npm run sync:eth-archive` maintains a durable, public read copy beneath
`public/ethereum-archive/contracts/<contract>/tokens/<token-id>/`. Each work
folder contains normalized metadata and the retrieved media bytes; each contract
also has a contract manifest, and `public/ethereum-archive/index.json` provides
the complete offline index used by the gallery and minted-work routes.

Ethereum remains the provenance authority. The committed copy is the default
read fallback when ENS, Alchemy, a gateway, or Ethereum itself is unavailable.
Every deployment sync compares evidence fingerprints, admits newly held works,
and downloads media again only when metadata or its canonical media reference
changes. A failed observation never deletes an existing archived work; it is
retained as `unobserved` until a later successful reconciliation determines its
current state.

## Constitutional grammar

FoldForge's living scaffold is defined in:

- `constitution/foldforge-constitution.json` — identity, higher reference, primitives, authority, modalities, and release standard
- `constitution/foldforge-instrument-completion.json` — the declared completion boundary for the FoldForge instrument
- `grammar/composition.schema.json` — validation contract for composition grammars
- `grammar/composition-001-luminance.json` — canonical Composition I mapping and lineage requirements
- `grammar/composition-002-lexical.json` — recurring language derived from collection, token, and description evidence
- `grammar/composition-003-resonance.json` — consent-first unified sound mapping across a three-octave field
- `grammar/composition-004-visual-relations.json` — color and spatial measurements composed as continuity and counterpoint
- `grammar/composition-005-chromatic.json` — perceptual color composed around an archive-derived circular seam
- `grammar/composition-witness.schema.json` — export contract for reproducible archive-state witnesses
- `docs/constitutional-architecture.md` — evidence → grammar → composition architecture and revision boundary

Root Logos provides constitutional orientation, not a shared runtime or identity. Ethereum evidence remains prior to every FoldForge interpretation. A holdings change creates a new composition state; a change to measurement, ordering, interpretation, or presentation requires a new grammar version.

### Instrument completion

The FoldForge instrument is declared complete in `FF-MILESTONE-0001` at
Resonant Holdings `11.0.0`. Its one voice, ten arrangements, six phases,
evidence mappings, visual relations, signed displacement, memory, motifs,
consent, silence, and witness model constitute the completed form.

Completion is a living boundary, not a frozen recording. Ethereum holdings,
canonical media, archive memory, witnessed displacement, and state-derived
performance continue to change what the instrument sounds. New mechanisms do
not enter through ordinary feature development. Reopening the grammar requires
an evidenced failure or exceptional necessity, a new major version, preserved
rollback, and explicit review of the completion declaration.

The Composer Chamber gives the same holdings five governed compositions: Luminance Field, Lexical Field, Resonant Holdings, Visual Relations, and Chromatic Field. Language is extracted from recurring source terms and directly conducts its attributable works during Recurrence. Sound speaks through one synthesized FoldForge voice while independently mapping luminance to register and filtering, the Chromatic Field to sequence and upper-partial character, chroma to harmonic intensity, lexical and visual relations to event order, contract identity to harmonic identity, token identity to rhythm, metadata density to envelope, and collection identity to a restrained stereo position. It never autoplays. The interface remains black and white; color is evidence and relation, not decoration.

Resonant Holdings also traverses a witnessed, 64-step root-to-crown displacement
field derived from the current Root Logos Living Object geometry. The map does
not import the Living Object renderer or sovereign voice, and it does not
replace FoldForge's timbral contour. Instead, signed deviations from the form's
mean radius and density push filtering, duration, harmonic intensity, pulse, and
stereo pressure above or below the existing FoldForge baseline. Each work
retains its own evidence-derived pitch. The committed displacement records the
Root Logos revision, geometry generator, neutral geometry, point count, bounds,
and SHA-256 witness; regenerate it with `npm run build:displacement-map`.

The [displacement-renewal workflow](.github/workflows/renew-root-logos-displacement.yml)
checks current Root Logos geometry at minute 11 of every hour, accepts a
`root-logos-published` repository dispatch when one is available, and may also
be started manually. The hourly check is the bounded recovery path that keeps
the systems convergent without requiring a cross-repository sender credential.
It regenerates the map before installing the full FoldForge toolchain, then
installs, tests, builds, and commits only when the witnessed geometry has
actually changed. Because workflow-token commits do not emit a second `push`
workflow, the renewal explicitly dispatches the normal Pages publisher after a
changed witness is committed. Root Logos is public, so that evidence checkout
requires no credential; the workflow-scoped `GITHUB_TOKEN` handles the
FoldForge commit and same-repository deployment dispatch.

Resonant Holdings can traverse those fixed work-to-note relationships through ten deterministic arrangements: luminance ascent, luminance descent, recursive fold, chromatic continuum, visual continuity, visual counterpoint, lexical recurrence, collection bodies, contract/token lineage, and a witness-seeded scatter. These arrangements are no longer listener-controlled. The archive derives its own six-part macroform—Ground, Fold, Recurrence, Fracture, Convergence, and Silence—from its witness hash, visual-signature distribution, contrast, collection count, and collection diversity.

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
Within a collection, the previous and next controls follow the same order shown by the collection grid. The left and right arrow keys provide the same traversal without wrapping at either boundary, and text-entry controls retain normal keyboard behavior.

## Canonical deployment and GitHub backup

The canonical production deployment is published from Lightsail at
[foldforge.zeropoet.xyz](https://foldforge.zeropoet.xyz). The former public
address, [foldforge.xyz](https://foldforge.xyz), permanently redirects to that
canonical studio subdomain. GitHub Pages is a manually invoked backup build;
it is not the live runtime or release authority.
After a successful deployment of every source push, FoldForge dispatches its
exact published commit to Root Logos for immediate connected-source witnessing.
The same successful deployment sends a bounded `telos-propagation` receipt to
Telos. It contains only repository identity, commit, change class, a public
summary, public witness URL, and time; Telos records it as pending semantic
synchronization rather than treating receipt as adoption.
FoldPortrait is a sealed archive and is never woken by FoldForge propagation.

FoldForge also publishes `public/record-sound-archive.json` as its bounded sound
manifest for [The Record](https://record.zeropoet.xyz/). The manifest exposes
declared structures and SHA-256 witnesses, not private browser media. The Record
pulls and validates it from the live FoldForge Lightsail surface; GitHub remains
a backup and is not part of that archive path.
Hourly archive observations also dispatch when their confirmed language witness
changes. Root Logos performs the final witness comparison, so a source push
whose public grammars and normalized language are unchanged remains dormant
after inspection. The publisher uses the
one-hour installation token minted by the Telos Bridge GitHub App and scoped to
Root Logos Contents write solely for `repository_dispatch`; Root Logos's daily
source check remains the recovery path.

Every deployment also rebuilds
`public/root-logos-language-composition.json` directly from the current allowed
Ethereum holdings. The export carries the twelve strongest ranked lexical
recurrences, distinct-work counts, a canonical token-identity witness, grammar
witness, semantic witness, and its own sealed witness. Provider titles,
descriptions, response ordering, and media recovery do not enter the archive
identity witness. A changed holdings count, identity set, or lexical term set
must appear in two consecutive hourly observations before it becomes confirmed
evidence. Pending observations are retained in a public sidecar but do not wake
Root Logos.

The canonical Lightsail release and its bounded observer carry live archive
changes. The manual GitHub backup does not define production state. An
unchanged lexical witness remains dormant in Root Logos. Only a changed rank,
term, recurrence count, trace count, or grammar changes the semantic witness
and recomposes Library editions.

1. Create a dedicated Alchemy app for this site.
2. Add its key at **Repository settings → Secrets and variables → Actions** as `NEXT_PUBLIC_ALCHEMY_API_KEY`.
3. Add the Telos Bridge GitHub App client ID as the repository variable
   `TELOS_BRIDGE_APP_CLIENT_ID` and its PKCS#8 private key as the repository
   secret `TELOS_BRIDGE_APP_PRIVATE_KEY`.
4. Select **Repository settings → Pages → Build and deployment → Source → GitHub Actions**.
5. Run the workflow manually only when a GitHub Pages backup snapshot is needed.

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

## Sonic Forge

`/sonic-forge` is FoldForge's private-by-default sound-sculpting chamber. A
listener can ingest a local sound, inspect its waveform and source format, and
monitor the untouched source against a live sculpted signal. Clarification,
witnessed displacement, steel-voice synthesis, timeline traversal, and
mastering are fixed by the versioned Sonic Forge instrument rather than exposed
as listener-controlled effects.
Sonic masters remain centered and balanced between left and right; witnessed
horizontal displacement is not mapped to stereo pan.
Its synthesis path excites three centered, high-Q formant resonators from the
source signal, producing a restrained steel-like voice rather than an
independent oscillator. Depth and recurrence suspend that voice without moving
its balance between the left and right channels.

## Relation Forge

`/relation-forge` is Sovereign Standard's private, pre-publication image and
language boundary for
[`@sovereignstandardtea`](https://www.instagram.com/sovereignstandardtea/).
It admits one browser-readable JPG, PNG, or WebP photograph into volatile local
memory, records its dimensions, SHA-256 identity, and visual field, then asks
the steward to confirm the subject, setting, light, material details, ritual
gesture, atmospheric field, and any product truth the image can responsibly
carry.

From that witnessed observation it deterministically composes three editable
post movements: stillness, ritual, and relation. Each includes literal alt text
and a three-part caption shaped by the eight approved Sovereign Standard posts.
The validator excludes hashtags, embedded links, pricing, wallet language, and
operational mechanics. A valid draft exports as
`foldforge-sovereign-instagram-draft/v1`, ready for human review and later
admission into the canonical Sovereign Standard image archive and Telos post
catalog. The photograph itself is never uploaded, retained, or embedded in the
packet, and Relation Forge has no Instagram credentials or posting authority.

Instrument `sonic-forge/steel-voice/v2` adds a fixed centered articulation
mapping: a 92 Hz low shelf gives bass and kick events physical foundation, a
restrained 168 Hz parallel body path lets plucked strings bloom into the depth
field, and a 4.8 kHz transient shelf preserves crisp drum attacks. The final
linked limiter contains the combined field without introducing stereo motion.

Quiet sources receive deterministic level recovery in
`sonic-forge/resonant-piano-body/v4` before the articulation
mapping. Sonic Forge raises RMS toward -20 dBFS, preserves -3 dBFS input-peak
headroom, and caps recovery at +12 dB. Source monitoring remains untouched;
only the Sculpted path and rendered master receive recovery. The linked limiter
and final master normalization continue to contain the resulting field.

Instrument `sonic-forge/resonant-piano-body/v4` moves the fixed voice away from
high-Q metallic-bar resonance and toward a grand-piano-like physical body. Its
broad source-excited partials center near 220, 554, and 1318 Hz; a wide 132 Hz
soundboard path supplies bloom; an 82 Hz shelf anchors the lowest register; and
a restrained 3.2 kHz shelf preserves a felt-like attack. It remains an original
FoldForge transformation rather than a sampled or simulated piano.

## Audio-native archive evidence

FoldForge admits audio-only mints without inventing image evidence. Canonical
audio in `animation_url` is decoded locally into a versioned signature covering
duration, sample rate, channels, RMS, peak, dynamic range, zero-crossing rate,
low-frequency energy, onset density, and tonal confidence. These measurements
govern register, event interval, envelope, spectral mass, and harmonic pressure.
Artwork, when present, continues to govern luminance, chroma, and visual
relations independently. Every token witness declares its available image,
audio, and language modalities; failed or inaccessible media remains explicitly
unresolved rather than receiving synthetic fallback evidence.

The master chamber renders the full sound offline through the committed Root
Logos displacement progression, normalizes it for clear laptop playback, and
encodes a 48 kHz / 24-bit stereo WAV. The WAV receives a SHA-256 identity and a
versioned JSON witness containing source measurements, stage values, timeline
stretch, displacement provenance, and output measurements.

Master admission is explicit. Admitted audio and witnesses remain in the
browser's IndexedDB-backed private library. Ingesting, rendering, or admitting
a master does not upload or publish audio, and clearing site data removes the
local library. Public library publication remains a separate repository-level
curatorial action.

Admission assigns a persistent, monotonic library sequence and filename in the
form `Sonic-Forge-0001-source-title-master.wav`. Sequence numbers are never
reused when a local master is removed.

## Temporal Forge

Temporal Forge brings the deterministic frame-player lineage of Sovereign
Standard's `sigil-sequence` into FoldForge as a complete visual-time
instrument. Multiple image frames are admitted locally, ordered naturally by
filename, and played as an infinite sequence at a selectable cadence. Frames
can be scrubbed, stepped, and reordered to expose recurrence, transition, and
collection-scale motion that is not visible in a static grid.

The chamber renders an actual 720, 1080, or 1440 square GIF89a loop or MP4 cycle while preserving
every source frame's aspect ratio against a selected black or white field, with optional color
inversion. A separate versioned JSON
witness records the exact frame order, SHA-256 source identities, cadence,
duration, fit rule, and Sovereign Standard lineage. Source frames remain in the
browser and are neither uploaded nor admitted to a public library.

## Ledger Witness

Ledger Witness is FoldForge's steward-operated XRPL minting and provenance
instrument and FoldPortrait's exclusive minting channel. It replaces the former
Sovereign Standard Witness interface while preserving FoldPortrait as the
authority for artwork, metadata, prepared mint documents, and canonical ledger
results. Sovereign Standard owns only vessel state and resulting relations.

The page reads committed local snapshots of FoldPortrait's canonical mint catalog
and SS claimed-vessel state. The completed archive contains 108 sealed canonical
works. Ledger Witness exposes that complete sequence as a compact status index,
while the signing selector admits only the next prepared work whose claim-order
vessel exists. There is no local-file bypass: works become selectable only after
FoldPortrait archives and sequences them. Intents persist
only in the operator's browser. FoldPortrait owns
artwork, metadata, hashes, and mint candidates; SS owns vessel state and the
resulting public relationship. The local release process imports the sealed
FoldPortrait catalog, validates its schema, authority, and work count, and
retains it as backup evidence. A manual GitHub workflow can refresh that backup
snapshot, but no schedule polls or wakes the completed FoldPortrait archive.
Prepared FoldPortrait sequence numbers attach automatically to claimed SS vessels
in `claimed_at` order. Unmatched works remain in preparation until the
corresponding vessel exists; the operator cannot override this relation.
The selector exposes only `prepared` works whose corresponding claimed vessel
already exists; minted and not-yet-assignable entries remain visible in the
archive index but cannot enter the signing flow. When exactly one work is
eligible, Ledger Witness selects it automatically without weakening the Xaman
human-signature boundary.
Ledger Witness deterministically
prepares an `NFTokenMint` transaction, hands that exact draft to the configured
Xaman witness wallet, and submits only the verified payload and transaction
identity to the existing server-side archive boundary. Seeds, API secrets, and
signing authority never enter FoldForge; every submission still requires the
human steward in Xaman.

After archive submission, Ledger Witness polls the live, canonical Sovereign
Standard Lightsail projection through the Cloudflare edge. Once that projection
confirms the mint, the Ledger updates in place and removes the completed work
from eligibility immediately. GitHub and deployed static catalogs remain backup
evidence; neither sits in the live completion path. This is operational
propagation only. It does not alter FoldForge's
Ethereum archive or compositional grammar, and Root Logos recomposes Library
voices only when FoldForge's separate composition witness changes.

## Dispatch

`/dispatch` is FoldForge's private local fulfillment chamber for Sovereign
Standard. SS remains authoritative for paid orders, monthly fulfillment,
collector identity, addresses, and vessel assignment. Its local weekly
fulfillment command emits one purpose-built
`sovereign-standard-shipping-manifest/v1` JSON file containing only the
packages fulfilled during that cycle.

Dispatch admits that file into volatile browser memory, validates every
required name and postal field, verifies the canonical `75 x 50 mm` MUNBYN profile,
and renders one vector label per assigned Black Tin Vessel. The steward can
review, select, and print any subset through a local macOS print bridge.
From a local FoldForge checkout, run `npm run dispatch:bridge`. The bridge
creates a random 256-bit pairing token, opens the live Dispatch page with that
token initially held only in the URL fragment, and accepts unlimited print
batches from the paired tab until the local process is stopped. The tab keeps
its pairing token in session storage so a refresh does not disconnect it.
It generates an exact-size PDF and sends it directly to `Printer_ITPP130` with
the verified `75 x 50 mm`, 270-degree correction, 100% scale, and no-banner
CUPS settings.

The bridge binds only to loopback, permits only the FoldForge production and
local development origins, validates the pairing token, page count, PDF
signature, and exact media dimensions, and removes every mode-0600 temporary
PDF as soon as CUPS accepts its job. It is not installed as a daemon and cannot
run unless the steward starts its local process; `Control-C` stops it.

No imported address is uploaded, stored in browser persistence, written to the
FoldForge repository, or propagated to Telos or Root Logos. Refreshing or
replacing the manifest releases the imported bytes.

Alchemy provides owner, contract, token, and cached metadata. `app/collection-policy.ts` applies repository-owned exclusions. `app/nft-data.ts` normalizes provider media and constructs responsive derivative URLs. `app/page.tsx` resolves the archive and computes or restores versioned visual signatures. `app/composition-witness.ts` seals every grammar and the current displacement-map witness into archive evidence, while `app/composer-chamber.tsx` derives the lexical field, archive-seamed chromatic field, autonomous six-phase macroform, visual-relation arrangements, displacement field, and unified FoldForge voice.

Every held contract is tokenURI-first: FoldForge reads its canonical metadata
document and original media before accepting provider or marketplace
derivatives. If a canonical gateway is temporarily unavailable, gallery tiles
fall through their ordered refreshed derivatives rather than disappearing.
For the FOLD FORGE contract
`0x16bc29ea6e1b9390f70349bfb93ea87ffc9105fc` and SOVEREIGN STANDARD contract
`0x716d8251ce9521657b6d36786e6f414e5c915895`, FoldForge additionally calls
`tokenURI(tokenId)` directly against current Ethereum state. The Root Logos
language export applies the same rule. Provider cache invalidation is useful
but never authoritative; a base-URI change in either directly read contract is
reflected in contract order.

`npm run refresh:eth-media` asks Alchemy to refresh every currently held
Ethereum token without rewriting any canonical media or repository data.
