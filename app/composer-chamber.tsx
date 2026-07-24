"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { composerGrammars } from "./composition-grammar";
import type { WitnessToken } from "./composition-witness";

export interface ComposerEvidence {
  key: string;
  contract: string;
  tokenId: string;
  name: string;
  description: string;
  collection: string;
  media: string;
  luminance: number | null;
}

interface LexicalTerm {
  term: string;
  count: number;
  sources: string[];
}

interface SoundProfile {
  frequency: number;
  interval: number;
  duration: number;
  pan: number;
  cutoff: number;
  harmonic: number;
}

type ArrangementMode = "ascent" | "descent" | "fold" | "collections" | "lineage" | "scatter";
type EvolutionPhaseId = "ground" | "fold" | "recurrence" | "fracture" | "convergence" | "silence";

interface EvolutionPhase {
  id: EvolutionPhaseId;
  label: string;
  description: string;
  arrangements: ArrangementMode[];
  events: number;
  restMs?: number;
}

interface ArchiveMemory {
  added: Set<string>;
  removed: WitnessToken[];
  shifted: Map<string, number>;
}

interface LuminosityMotif {
  frequency: number;
  count: number;
  token: ComposerEvidence;
}

const arrangementModes: Array<{
  id: ArrangementMode;
  label: string;
  description: string;
}> = [
  { id: "ascent", label: "Ascent", description: "Dark → light" },
  { id: "descent", label: "Descent", description: "Light → dark" },
  { id: "fold", label: "Fold", description: "Outer values → center" },
  { id: "collections", label: "Bodies", description: "Collection blocks" },
  { id: "lineage", label: "Lineage", description: "Contract → token" },
  { id: "scatter", label: "Scatter", description: "Witness-seeded field" },
];

const stopWords = new Set([
  "a", "an", "and", "are", "as", "at", "be", "but", "by", "for", "from", "in",
  "into", "is", "it", "not", "of", "on", "or", "that", "the", "this", "to",
  "what", "with", "without",
  "collection", "token", "untitled", "work",
]);
const scaleSemitones = [0, 3, 5, 7, 10];

function lexicalField(tokens: ComposerEvidence[]): LexicalTerm[] {
  const terms = new Map<string, Set<string>>();

  for (const token of tokens) {
    const source = `${token.name} ${token.description} ${token.collection}`;
    const words = source
      .toLocaleLowerCase()
      .match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu) || [];
    for (const word of new Set(words)) {
      if (word.length < 3 || stopWords.has(word) || /^\d+$/.test(word)) continue;
      const sources = terms.get(word) || new Set<string>();
      sources.add(token.key);
      terms.set(word, sources);
    }
  }

  return [...terms.entries()]
    .map(([term, sources]) => ({ term, count: sources.size, sources: [...sources].sort() }))
    .sort((a, b) => b.count - a.count || a.term.localeCompare(b.term))
    .slice(0, 24);
}

function stableNumber(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function compareTokenIds(left: string, right: string): number {
  try {
    const leftId = BigInt(left);
    const rightId = BigInt(right);
    return leftId < rightId ? -1 : leftId > rightId ? 1 : 0;
  } catch {
    return left.localeCompare(right);
  }
}

function arrangeEvidence(
  evidence: ComposerEvidence[],
  mode: ArrangementMode,
  stateHash: string,
): ComposerEvidence[] {
  const ordered = [...evidence];

  if (mode === "descent") return ordered.reverse();
  if (mode === "fold") {
    const folded: ComposerEvidence[] = [];
    let dark = 0;
    let light = ordered.length - 1;
    while (dark <= light) {
      folded.push(ordered[dark]);
      if (dark !== light) folded.push(ordered[light]);
      dark += 1;
      light -= 1;
    }
    return folded;
  }
  if (mode === "collections") {
    return ordered.sort((left, right) =>
      left.collection.localeCompare(right.collection) ||
      (left.luminance ?? 0) - (right.luminance ?? 0) ||
      left.key.localeCompare(right.key),
    );
  }
  if (mode === "lineage") {
    return ordered.sort((left, right) =>
      left.contract.localeCompare(right.contract) ||
      compareTokenIds(left.tokenId, right.tokenId),
    );
  }
  if (mode === "scatter") {
    return ordered.sort((left, right) =>
      stableNumber(`${stateHash}:${left.key}`) - stableNumber(`${stateHash}:${right.key}`) ||
      left.key.localeCompare(right.key),
    );
  }
  return ordered;
}

function deriveEvolution(evidence: ComposerEvidence[], stateHash: string): EvolutionPhase[] {
  const audible = evidence.filter((token) => token.luminance != null);
  const values = audible.map((token) => token.luminance ?? 0);
  const mean = values.reduce((total, value) => total + value, 0) / Math.max(values.length, 1);
  const variance = values.reduce((total, value) => total + (value - mean) ** 2, 0) / Math.max(values.length, 1);
  const contrast = Math.min(1, Math.sqrt(variance) * 3.2);
  const collectionCount = new Set(audible.map((token) => token.collection)).size;
  const diversity = Math.min(1, collectionCount / Math.max(Math.sqrt(audible.length), 1));
  const seed = stableNumber(stateHash);
  const span = (base: number, range: number, offset: number) => base + ((seed >>> offset) % range);

  return [
    {
      id: "ground",
      label: "Ground",
      description: `Tonal center / mean value ${mean.toFixed(3)}`,
      arrangements: ["ascent"],
      events: span(18, 9, 0),
    },
    {
      id: "fold",
      label: "Fold",
      description: "Luminance extremes answer inward",
      arrangements: ["fold"],
      events: span(24, 13, 4),
    },
    {
      id: "recurrence",
      label: "Recurrence",
      description: `${collectionCount} collection bodies remember`,
      arrangements: diversity > 0.5 ? ["collections", "lineage"] : ["collections"],
      events: span(30, 17, 8),
    },
    {
      id: "fracture",
      label: "Fracture",
      description: `Contrast ${contrast.toFixed(3)} opens the field`,
      arrangements: contrast > 0.45 ? ["fold", "scatter", "descent"] : ["fold", "scatter"],
      events: span(34, 19, 12),
    },
    {
      id: "convergence",
      label: "Convergence",
      description: "Independent paths seek common value",
      arrangements: ["ascent", "lineage"],
      events: span(28, 15, 16),
    },
    {
      id: "silence",
      label: "Silence",
      description: "The archive retains an unfilled interval",
      arrangements: [],
      events: 0,
      restMs: 1800 + Math.round((1 - diversity) * 1600) + (seed % 900),
    },
  ];
}

function tokenKey(token: { contract: string; tokenId: string }): string {
  return `${token.contract.toLowerCase()}:${token.tokenId}`;
}

function deriveMemory(evidence: ComposerEvidence[], previous: WitnessToken[]): ArchiveMemory {
  const current = new Map(evidence.map((token) => [token.key, token]));
  const prior = new Map(previous.map((token) => [tokenKey(token), token]));
  const shifted = new Map<string, number>();

  for (const [key, token] of current) {
    const former = prior.get(key);
    if (
      former?.luminance != null &&
      token.luminance != null &&
      Math.abs(former.luminance - token.luminance) >= 0.01
    ) {
      shifted.set(key, former.luminance);
    }
  }

  return {
    added: new Set([...current.keys()].filter((key) => !prior.has(key))),
    removed: [...prior.entries()].filter(([key]) => !current.has(key)).map(([, token]) => token),
    shifted,
  };
}

function deriveMotifs(evidence: ComposerEvidence[]): LuminosityMotif[] {
  const groups = new Map<string, { frequency: number; tokens: ComposerEvidence[] }>();
  for (const token of evidence) {
    if (token.luminance == null) continue;
    const frequency = soundProfile(token).frequency;
    const key = frequency.toFixed(3);
    const group = groups.get(key) || { frequency, tokens: [] };
    group.tokens.push(token);
    groups.set(key, group);
  }

  return [...groups.values()]
    .map((group) => ({
      frequency: group.frequency,
      count: group.tokens.length,
      token: [...group.tokens].sort((left, right) => left.key.localeCompare(right.key))[0],
    }))
    .sort((left, right) => right.count - left.count || left.frequency - right.frequency)
    .slice(0, 5);
}

function soundProfile(token: ComposerEvidence): SoundProfile {
  const bounded = Math.max(0, Math.min(1, token.luminance ?? 0));
  const contractSeed = stableNumber(token.contract);
  const tokenSeed = stableNumber(token.tokenId);
  const metadataDensity = Math.min(1, `${token.name} ${token.description}`.length / 900);
  const noteIndex = Math.round(bounded * 15);
  const octave = Math.floor(noteIndex / scaleSemitones.length);
  const semitone = scaleSemitones[noteIndex % scaleSemitones.length] + octave * 12;

  return {
    frequency: 73.416 * 2 ** (semitone / 12),
    interval: [360, 400, 440][tokenSeed % 3],
    duration: 0.34 + metadataDensity * 0.7,
    pan: (((stableNumber(token.collection) % 201) - 100) / 100) * 0.34,
    cutoff: 520 + bounded * 3300,
    harmonic: 0.08 + (contractSeed % 19) / 100,
  };
}

function scheduleTone(
  context: AudioContext,
  destination: AudioNode,
  token: ComposerEvidence,
  now: number,
  amplitude = 1,
  originFrequency?: number,
) {
  const profile = soundProfile(token);
  const panner = context.createStereoPanner();
  const envelope = context.createGain();
  const filter = context.createBiquadFilter();
  panner.pan.setValueAtTime(profile.pan * 0.72, now);
  envelope.gain.setValueAtTime(0.0001, now);
  envelope.gain.exponentialRampToValueAtTime(0.034 * amplitude, now + 0.035);
  envelope.gain.exponentialRampToValueAtTime(0.0001, now + profile.duration);
  filter.frequency.setValueAtTime(profile.cutoff, now);
  filter.Q.setValueAtTime(2.4, now);
  filter.type = "lowpass";
  filter.connect(envelope);
  envelope.connect(panner);
  panner.connect(destination);

  const fundamental = context.createOscillator();
  const harmonic = context.createOscillator();
  const harmonicGain = context.createGain();
  const movement = context.createOscillator();
  const movementDepth = context.createGain();
  fundamental.type = "sine";
  fundamental.frequency.setValueAtTime(originFrequency ?? profile.frequency, now);
  if (originFrequency != null && Math.abs(originFrequency - profile.frequency) >= 0.01) {
    fundamental.frequency.exponentialRampToValueAtTime(profile.frequency, now + profile.duration * 0.72);
  }
  harmonic.type = "triangle";
  harmonic.frequency.setValueAtTime(profile.frequency * 2, now);
  harmonic.detune.setValueAtTime((stableNumber(token.contract) % 9) - 4, now);
  harmonicGain.gain.setValueAtTime(profile.harmonic, now);
  movement.frequency.setValueAtTime(0.7 + (stableNumber(token.tokenId) % 8) / 10, now);
  movementDepth.gain.setValueAtTime(profile.frequency * 0.012, now);
  movement.connect(movementDepth);
  movementDepth.connect(fundamental.frequency);
  fundamental.connect(filter);
  harmonic.connect(harmonicGain);
  harmonicGain.connect(filter);
  fundamental.start(now);
  harmonic.start(now);
  movement.start(now);
  fundamental.stop(now + profile.duration);
  harmonic.stop(now + profile.duration);
  movement.stop(now + profile.duration);
}

export default function ComposerChamber({
  evidence,
  stateHash,
  previousEvidence,
  previousStateHash,
  onExportWitness,
}: {
  evidence: ComposerEvidence[];
  stateHash: string;
  previousEvidence?: WitnessToken[];
  previousStateHash?: string;
  onExportWitness?: () => void;
}) {
  const lexicalTerms = useMemo(() => lexicalField(evidence), [evidence]);
  const evolution = useMemo(() => deriveEvolution(evidence, stateHash), [evidence, stateHash]);
  const memory = useMemo(
    () => previousEvidence ? deriveMemory(evidence, previousEvidence) : {
      added: new Set<string>(),
      removed: [],
      shifted: new Map<string, number>(),
    },
    [evidence, previousEvidence],
  );
  const motifs = useMemo(() => deriveMotifs(evidence), [evidence]);
  const arrangedEvidence = useMemo(() => Object.fromEntries(
    arrangementModes.map((mode) => [
      mode.id,
      arrangeEvidence(
        evidence.filter((token) => token.luminance != null),
        mode.id,
        stateHash,
      ),
    ]),
  ) as Record<ArrangementMode, ComposerEvidence[]>, [evidence, stateHash]);
  const [soundEvent, setSoundEvent] = useState<{
    arrangement: ArrangementMode;
    index: number;
    token: ComposerEvidence;
  } | null>(null);
  const [soundPlaying, setSoundPlaying] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [phaseProgress, setPhaseProgress] = useState(0);
  const audioContext = useRef<AudioContext | null>(null);
  const soundTimers = useRef<Map<ArrangementMode, ReturnType<typeof setTimeout>>>(new Map());
  const soundCursors = useRef<Map<ArrangementMode, number>>(new Map());
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseGeneration = useRef(0);
  const phaseEventCount = useRef(0);
  const transitionLocked = useRef(false);

  const currentPhase = evolution[phaseIndex] ?? evolution[0];
  const fallbackArrangement = currentPhase.arrangements[0] ?? "ascent";
  const currentSound = soundEvent?.token ?? arrangedEvidence[fallbackArrangement]?.[0];
  const currentArrangement = arrangementModes.find((mode) => mode.id === soundEvent?.arrangement) ??
    arrangementModes.find((mode) => mode.id === fallbackArrangement) ??
    arrangementModes[0];

  function stopSound() {
    for (const timer of soundTimers.current.values()) clearTimeout(timer);
    soundTimers.current.clear();
    if (transitionTimer.current) clearTimeout(transitionTimer.current);
    transitionTimer.current = null;
    phaseGeneration.current += 1;
    transitionLocked.current = false;
    setSoundPlaying(false);
    void audioContext.current?.close();
    audioContext.current = null;
  }

  function playSound() {
    if (soundPlaying) return;
    const context = new AudioContext();
    const compressor = context.createDynamicsCompressor();
    const dry = context.createGain();
    const delay = context.createDelay(1.5);
    const feedback = context.createGain();
    const wet = context.createGain();
    compressor.threshold.value = -22;
    compressor.knee.value = 18;
    compressor.ratio.value = 5;
    dry.gain.value = 0.82;
    wet.gain.value = 0.18;
    delay.delayTime.value = 0.4;
    feedback.gain.value = 0.2;
    compressor.connect(dry);
    dry.connect(context.destination);
    compressor.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wet);
    wet.connect(context.destination);
    audioContext.current = context;
    setSoundPlaying(true);
    soundCursors.current.clear();
    setSoundEvent(null);

    const beginPhase = (nextPhaseIndex: number) => {
      for (const timer of soundTimers.current.values()) clearTimeout(timer);
      soundTimers.current.clear();
      transitionLocked.current = false;
      phaseEventCount.current = 0;
      setPhaseProgress(0);
      setSoundEvent(null);

      const normalizedIndex = nextPhaseIndex % evolution.length;
      const phase = evolution[normalizedIndex];
      const generation = phaseGeneration.current + 1;
      phaseGeneration.current = generation;
      setPhaseIndex(normalizedIndex);

      if (!phase.arrangements.length) {
        transitionTimer.current = setTimeout(
          () => beginPhase(normalizedIndex + 1),
          phase.restMs ?? 2200,
        );
        return;
      }

      const amplitude = 1 / Math.sqrt(phase.arrangements.length);
      if (phase.id === "convergence" && memory.removed.length) {
        memory.removed.slice(0, 4).forEach((token, index) => {
          if (token.luminance == null) return;
          const echo: ComposerEvidence = {
            key: tokenKey(token),
            contract: token.contract,
            tokenId: token.tokenId,
            name: `Echo / ${token.tokenId}`,
            description: "",
            collection: "Archive memory",
            media: token.media || "",
            luminance: token.luminance,
          };
          scheduleTone(context, compressor, echo, context.currentTime + index * 0.18, 0.16);
        });
      }
      const advance = () => {
        if (transitionLocked.current || generation !== phaseGeneration.current) return;
        transitionLocked.current = true;
        for (const timer of soundTimers.current.values()) clearTimeout(timer);
        soundTimers.current.clear();
        transitionTimer.current = setTimeout(() => beginPhase(normalizedIndex + 1), 240);
      };

      for (const mode of phase.arrangements) {
        const sequence = arrangedEvidence[mode];
        if (!sequence.length) continue;
        const emit = () => {
          if (generation !== phaseGeneration.current || transitionLocked.current) return;
          const current = soundCursors.current.get(mode) ?? 0;
          const index = current % sequence.length;
          const token = sequence[index];
          const profile = soundProfile(token);
          const formerLuminance = memory.shifted.get(token.key);
          const originFrequency = formerLuminance == null
            ? undefined
            : soundProfile({ ...token, luminance: formerLuminance }).frequency;
          const eventAmplitude = amplitude * (memory.added.has(token.key) ? 1.16 : 1);
          setSoundEvent({ arrangement: mode, index, token });
          scheduleTone(context, compressor, token, context.currentTime, eventAmplitude, originFrequency);
          soundCursors.current.set(mode, (index + 1) % sequence.length);
          phaseEventCount.current += 1;
          const motifPeriod = 7 + (stableNumber(stateHash) % 5);
          if (
            phase.id !== "ground" &&
            motifs.length &&
            phaseEventCount.current % motifPeriod === 0
          ) {
            const motif = motifs[Math.floor(phaseEventCount.current / motifPeriod) % motifs.length];
            scheduleTone(context, compressor, motif.token, context.currentTime + 0.13, amplitude * 0.28);
          }
          setPhaseProgress(phaseEventCount.current);
          if (phaseEventCount.current >= phase.events) {
            advance();
            return;
          }
          soundTimers.current.set(mode, setTimeout(emit, profile.interval));
        };
        emit();
      }
    };

    beginPhase(0);
  }

  useEffect(() => () => {
    for (const timer of soundTimers.current.values()) clearTimeout(timer);
    if (transitionTimer.current) clearTimeout(transitionTimer.current);
    void audioContext.current?.close();
  }, []);

  const currentProfile = currentSound ? soundProfile(currentSound) : null;
  const phaseRatio = currentPhase.events
    ? Math.min(1, phaseProgress / currentPhase.events)
    : soundPlaying && currentPhase.id === "silence" ? 1 : 0;

  return (
    <section className="composer-chamber min-w-0 border-b border-white/20 py-12 md:py-16">
      <div className="mb-8 grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="text-[9px] uppercase tracking-[0.28em] text-white/45">Composer chamber</p>
          <h2 className="mt-4 max-w-4xl text-3xl font-light uppercase tracking-[-0.035em] md:text-6xl">
            The archive becomes<br />an instrument.
          </h2>
          <p className="mt-5 max-w-2xl text-[9px] uppercase leading-5 tracking-[0.18em] text-white/30">
            A witnessed Ethereum archive conducting its own luminosity, recurrence, fracture, convergence, and rest.
          </p>
        </div>
        <div className="font-mono text-[7px] uppercase leading-5 tracking-[0.14em] text-white/25 md:text-right">
          <p>Witness / {stateHash.slice(7, 19)}</p>
          <p>{evidence.length.toString().padStart(3, "0")} source works</p>
          <p>Grammars 002–003 / living</p>
        </div>
      </div>

      <div className="grid gap-px bg-white/20 lg:grid-cols-3">
        <article className="order-2 bg-black p-5 md:p-7 lg:col-span-1">
          <CompositionHeader grammar={composerGrammars.language} />
          <p className="mt-8 text-2xl font-light uppercase leading-[1.25] tracking-[-0.025em] md:text-4xl">
            {lexicalTerms.slice(0, 9).map((entry) => entry.term).join(" / ") || "No recurring source language"}
          </p>
          <div className="mt-8 border-t border-white/15">
            {lexicalTerms.slice(0, 12).map((entry) => (
              <div className="grid grid-cols-[1fr_auto_auto] gap-4 border-b border-white/10 py-3 text-[8px] uppercase tracking-[0.16em]" key={entry.term}>
                <span className="text-white/65">{entry.term}</span>
                <span className="font-mono text-white/25">{entry.count.toString().padStart(2, "0")} works</span>
                <span className="font-mono text-white/20">{entry.sources.length.toString().padStart(2, "0")} traces</span>
              </div>
            ))}
          </div>
          <p className="mt-5 text-[8px] uppercase leading-4 tracking-[0.16em] text-white/25">
            Recurrence is evidence of presence, not a claim of final meaning.
          </p>
          <div className="mt-8 border-t border-white/15 pt-5">
            <div className="flex items-center justify-between gap-4">
              <p className="text-[8px] uppercase tracking-[0.2em] text-white/45">Archive memory</p>
              <p className="font-mono text-[6px] uppercase tracking-[0.12em] text-white/20">
                {previousStateHash ? `Prior / ${previousStateHash.slice(7, 19)}` : "First witnessed state"}
              </p>
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-px bg-white/10 font-mono text-[7px] uppercase tracking-[0.1em]">
              <div className="bg-black p-3"><dt className="text-white/25">Entered</dt><dd className="mt-2 text-white/60">{memory.added.size.toString().padStart(2, "0")}</dd></div>
              <div className="bg-black p-3"><dt className="text-white/25">Echoes</dt><dd className="mt-2 text-white/60">{memory.removed.length.toString().padStart(2, "0")}</dd></div>
              <div className="bg-black p-3"><dt className="text-white/25">Shifted</dt><dd className="mt-2 text-white/60">{memory.shifted.size.toString().padStart(2, "0")}</dd></div>
            </dl>
            <div className="mt-5">
              <p className="text-[7px] uppercase tracking-[0.18em] text-white/30">Recurring luminosity motifs</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {motifs.map((motif, index) => (
                  <span className="border border-white/15 px-2 py-2 font-mono text-[6px] uppercase tracking-[0.1em] text-white/35" key={motif.frequency}>
                    M{String(index + 1).padStart(2, "0")} / {motif.frequency.toFixed(1)} Hz / {motif.count} works
                  </span>
                ))}
              </div>
            </div>
          </div>
        </article>

        <article className="order-1 grid content-between bg-black p-5 md:p-8 lg:col-span-2">
          <div>
            <CompositionHeader grammar={composerGrammars.sound} />
            <div className="mt-7 grid grid-cols-2 gap-px bg-white/15 sm:grid-cols-3">
              {evolution.map((phase, index) => (
                <div
                  className={`min-h-20 p-3 transition ${index === phaseIndex ? "bg-white text-black" : "bg-black text-white"}`}
                  key={phase.id}
                >
                  <span className="block text-[8px] uppercase tracking-[0.18em]">{String(index + 1).padStart(2, "0")} / {phase.label}</span>
                  <span className={`mt-2 block font-mono text-[6px] uppercase leading-3 tracking-[0.1em] ${index === phaseIndex ? "text-black/55" : "text-white/25"}`}>{phase.description}</span>
                </div>
              ))}
            </div>
            <div aria-live="polite" className="mt-px bg-white/[0.04] px-3 py-3 font-mono text-[7px] uppercase tracking-[0.14em] text-white/35">
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 ${soundPlaying ? "bg-white" : "border border-white/35"}`} />
                  {soundPlaying ? "Evolution active" : "Evolution held"}
                </span>
                <span>{currentPhase.label} / {currentPhase.arrangements.length || "—"} voices</span>
              </div>
              <div className="mt-3 h-px overflow-hidden bg-white/10">
                <span className="block h-full bg-white transition-[width] duration-300" style={{ width: `${phaseRatio * 100}%` }} />
              </div>
              <p className="mt-3 text-right text-white/25">
                {currentPhase.arrangements.length ? currentPhase.arrangements.map((mode) => arrangementModes.find((entry) => entry.id === mode)?.label).join(" + ") : `${currentPhase.restMs} ms rest`}
              </p>
            </div>
            <div className="mt-10 grid min-h-52 place-items-center border border-white/15">
              <div className="text-center">
                <p className="font-mono text-5xl font-light tracking-[-0.06em] md:text-7xl">
                  {currentProfile ? currentProfile.frequency.toFixed(1) : "—"}
                </p>
                <p className="mt-3 text-[8px] uppercase tracking-[0.2em] text-white/30">Hz / Fold voice</p>
                <p className="mt-6 max-w-xs truncate text-[10px] uppercase tracking-[0.15em] text-white/55">{currentSound?.name || "Awaiting witness"}</p>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-px bg-white/15 font-mono text-[7px] uppercase tracking-[0.12em] sm:grid-cols-4">
              <div className="bg-black p-3"><dt className="text-white/25">Register</dt><dd className="mt-2 text-white/60">3 octaves</dd></div>
              <div className="bg-black p-3"><dt className="text-white/25">Pulse</dt><dd className="mt-2 text-white/60">{currentProfile?.interval ?? "—"} ms</dd></div>
              <div className="bg-black p-3"><dt className="text-white/25">Filter</dt><dd className="mt-2 text-white/60">{currentProfile ? Math.round(currentProfile.cutoff) : "—"} Hz</dd></div>
              <div className="bg-black p-3"><dt className="text-white/25">Field</dt><dd className="mt-2 text-white/60">{currentProfile ? `${currentProfile.pan < 0 ? "L" : "R"} ${Math.abs(currentProfile.pan).toFixed(2)}` : "—"}</dd></div>
            </dl>
          </div>
          <div className="mt-6 flex items-center justify-between gap-4">
            <div className="font-mono text-[8px] uppercase tracking-[0.14em] text-white/25">
              <p>Phase {String(phaseIndex + 1).padStart(2, "0")} / {String(evolution.length).padStart(2, "0")} · Event {phaseProgress.toString().padStart(3, "0")} / {currentPhase.events ? currentPhase.events.toString().padStart(3, "0") : "REST"}</p>
              <p className="mt-2 text-white/40">{soundEvent ? `${currentArrangement.label} / ${currentArrangement.description}` : currentPhase.description}</p>
            </div>
            <button
              className={`min-w-32 border px-5 py-4 text-[8px] uppercase tracking-[0.22em] transition ${soundPlaying ? "border-white/35 text-white/60 hover:border-white hover:text-white" : "border-white bg-white text-black hover:bg-black hover:text-white"}`}
              onClick={soundPlaying ? stopSound : playSound}
              type="button"
            >
              {soundPlaying ? "Silence" : "Witness"}
            </button>
          </div>
          {onExportWitness ? (
            <button className="mt-5 font-mono text-[7px] uppercase tracking-[0.16em] text-white/25 transition hover:text-white" onClick={onExportWitness} type="button">
              State {stateHash.slice(7, 19)} / Export evidence witness ↓
            </button>
          ) : null}
        </article>
      </div>

    </section>
  );
}

function CompositionHeader({
  grammar,
}: {
  grammar: { id: string; version: string; title: string; interfaceStatement: string };
}) {
  return (
    <div className="flex items-start justify-between gap-5">
      <div>
        <p className="text-[9px] uppercase tracking-[0.26em] text-white/45">{grammar.title}</p>
        <p className="mt-2 text-[8px] uppercase leading-4 tracking-[0.16em] text-white/25">{grammar.interfaceStatement}</p>
      </div>
      <p className="shrink-0 font-mono text-[7px] uppercase tracking-[0.12em] text-white/20">{grammar.id} / v{grammar.version}</p>
    </div>
  );
}
