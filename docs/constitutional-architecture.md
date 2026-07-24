# FoldForge Constitutional Architecture

FoldForge is an Ethereum NFT data composer. Ethereum supplies evidence; FoldForge discovers and versions grammars through which that evidence becomes composition. Root Logos supplies constitutional orientation without becoming a runtime dependency, shared identity, or authority over token data.

## Three layers

### Evidence

Public Ethereum state, ENS resolution, contract ownership, token identity, canonical metadata, source media, and provenance constitute the evidence layer. Evidence is received and normalized but never rewritten.

### Grammar

A grammar declares how evidence becomes relation. Each grammar names its required inputs, ordered transformations, presentation rules, authority boundary, lineage requirements, revision triggers, and claims.

Grammar manifests live in `grammar/` and validate against `grammar/composition.schema.json`.

### Composition

A composition is a rendering of one archive state under one grammar version. It is not the canonical archive and does not claim to reveal the final meaning of any work.

```text
archive state
+ constitution revision
+ grammar version
+ declared transformations
= reproducible composition
```

## Witness

Every resolved composition state produces a Composition Witness. The witness records:

- composition ID, grammar version, and constitution revision;
- Ethereum network, archive identity, and resolved owner address;
- included contract addresses;
- token contract, token ID, canonical media URL, and measured luminance;
- a deterministic SHA-256 state hash;
- the time at which the state was observed.

The hash excludes observation time. The same evidence under the same grammar therefore produces the same state hash. A holding, media, luminance, contract-policy, or grammar change produces a different hash.

Witnesses validate against `grammar/composition-witness.schema.json`. The browser preserves up to 24 distinct witnessed states per owner and permits the current witness to be exported as JSON. Local history is a convenience record, not canonical Ethereum evidence.

## Composition I

`FF-COMP-0001` is the Luminance Field. It samples each visible token image, calculates average perceived luminance, and orders the results from dark to light. The measured field is retained as a hidden compositional substrate rather than rendered as a public image grid.

Its governing distinction is simple:

> Difference in presentation must arise from evidence and a declared grammar.

The composition therefore uses no arbitrary scale hierarchy. Missing media remains missing until token-specific canonical metadata supplies it.

## Composition II

`FF-COMP-0002` is the Lexical Field. It extracts recurring terms from token names, collection names, and descriptions, counts presence by distinct source work, and compresses the strongest recurrences into an archive utterance. Recurrence is evidence of presence, not a claim of final meaning.

## Composition III

`FF-COMP-0003` is Resonant Holdings. Each work speaks through one FoldForge voice. Luminance determines register and spectral filtering; contract identity shapes harmonic character; token identity supplies pulse and movement; metadata density supplies envelope; collection identity supplies restrained spatial position.

The archive conducts these fixed work-level mappings through a six-phase autonomous macroform:

1. Ground establishes the tonal center from luminance ascent.
2. Fold brings dark and light extremes into alternating relation.
3. Recurrence layers collection and contract memory according to archive diversity.
4. Fracture opens two or three paths according to luminance contrast.
5. Convergence brings ascent and lineage into shared time.
6. Silence retains a state-derived interval before the cycle reforms.

The listener may begin or silence the witness. Phase selection, event budgets, arrangement layering, and rest duration are derived from the current evidence and state hash, not manually controlled.

## Revision

A change in holdings creates a new composition state under the existing grammar. A change in measurement, ordering, interpretation, or presentation logic requires a new grammar version.

Future image, sound, video, language, or sequence grammars should begin as proposals. They become living only after their source fidelity, mappings, authority boundaries, reproducibility, accessibility, and rollback path are reviewed.
