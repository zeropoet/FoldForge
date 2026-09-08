"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export interface ComposerSource {
  name: string;
  contractCount: number;
  workCount: number;
  observedWorkCount: number;
  witness: string;
  tokens: Array<{ key: string; name: string; evidence: string }>;
}

function stableNumber(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function sourceValue(source: ComposerSource) {
  const seed = stableNumber(source.witness);
  const density = source.workCount / Math.max(source.contractCount, 1);
  return {
    frequency: 55 * 2 ** (((seed % 18) + Math.min(12, Math.round(density / 2))) / 12),
    pulse: Math.max(280, 760 - Math.min(260, source.workCount * 3) + (seed % 91)),
    cutoff: 720 + (seed % 2200) + source.contractCount * 86,
    harmonic: 1.25 + ((seed >>> 7) % 7) / 4,
    density,
  };
}

function voice(
  context: AudioContext,
  destination: AudioNode,
  source: ComposerSource,
  token: ComposerSource["tokens"][number],
  now: number,
  amplitude: number,
) {
  const value = sourceValue(source);
  const tokenSeed = stableNumber(`${source.witness}:${token.key}:${token.evidence}`);
  const scale = [0, 2, 5, 7, 10];
  const interval = scale[tokenSeed % scale.length] + (Math.floor(tokenSeed / 5) % 3) * 12;
  const frequency = value.frequency * 2 ** (interval / 12);
  const duration = Math.min(1.35, .34 + value.density / 80 + (token.name.length % 19) / 80);
  const filter = context.createBiquadFilter();
  const envelope = context.createGain();
  const fundamental = context.createOscillator();
  const overtone = context.createOscillator();
  const overtoneGain = context.createGain();

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(value.cutoff, now);
  filter.Q.setValueAtTime(1.7, now);
  envelope.gain.setValueAtTime(.0001, now);
  envelope.gain.exponentialRampToValueAtTime(.026 * amplitude, now + .045);
  envelope.gain.exponentialRampToValueAtTime(.0001, now + duration);
  fundamental.type = tokenSeed % 2 ? "sine" : "triangle";
  fundamental.frequency.setValueAtTime(frequency, now);
  overtone.type = "sine";
  overtone.frequency.setValueAtTime(frequency * value.harmonic, now);
  overtoneGain.gain.setValueAtTime(.12 + (tokenSeed % 13) / 100, now);
  fundamental.connect(filter);
  overtone.connect(overtoneGain);
  overtoneGain.connect(filter);
  filter.connect(envelope);
  envelope.connect(destination);
  fundamental.start(now);
  overtone.start(now);
  fundamental.stop(now + duration);
  overtone.stop(now + duration);
}

function sharedVoice(
  context: AudioContext,
  destination: AudioNode,
  sources: ComposerSource[],
  now: number,
) {
  const [left, right] = sources.map(sourceValue);
  const relation = context.createOscillator();
  const upper = context.createOscillator();
  const filter = context.createBiquadFilter();
  const envelope = context.createGain();
  const relationRoot = Math.sqrt(left.frequency * right.frequency);
  const difference = Math.max(1.5, Math.abs(left.frequency - right.frequency));
  relation.type = "sawtooth";
  relation.frequency.setValueAtTime(relationRoot, now);
  relation.detune.setValueAtTime(difference * 1.7, now);
  upper.type = "triangle";
  upper.frequency.setValueAtTime(relationRoot * ((left.harmonic + right.harmonic) / 2), now);
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(Math.sqrt(left.cutoff * right.cutoff), now);
  filter.Q.setValueAtTime(3.2, now);
  envelope.gain.setValueAtTime(.0001, now);
  envelope.gain.exponentialRampToValueAtTime(.021, now + .16);
  envelope.gain.exponentialRampToValueAtTime(.0001, now + 1.8);
  relation.connect(filter);
  upper.connect(filter);
  filter.connect(envelope);
  envelope.connect(destination);
  relation.start(now);
  upper.start(now);
  relation.stop(now + 1.8);
  upper.stop(now + 1.8);
}

export default function DualSourceComposer({ sources }: { sources: ComposerSource[] }) {
  const values = useMemo(() => sources.map(sourceValue), [sources]);
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(0);
  const [activeSource, setActiveSource] = useState(0);
  const contextRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function stop() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    void contextRef.current?.close();
    contextRef.current = null;
    setPlaying(false);
  }

  function play() {
    if (playing || sources.some((source) => !source.tokens.length)) return;
    const context = new AudioContext();
    const compressor = context.createDynamicsCompressor();
    const master = context.createGain();
    compressor.threshold.value = -24;
    compressor.knee.value = 22;
    compressor.ratio.value = 4;
    master.gain.value = .82;
    compressor.connect(master);
    master.connect(context.destination);
    contextRef.current = context;
    setPlaying(true);
    let cursor = 0;

    const emit = () => {
      const sourceIndex = cursor % sources.length;
      const counterIndex = (sourceIndex + 1) % sources.length;
      const source = sources[sourceIndex];
      const counter = sources[counterIndex];
      const token = source.tokens[Math.floor(cursor / sources.length) % source.tokens.length];
      const counterToken = counter.tokens[Math.floor(cursor / sources.length) % counter.tokens.length];
      const now = context.currentTime;
      voice(context, compressor, source, token, now, .78);
      voice(context, compressor, counter, counterToken, now, .78);
      sharedVoice(context, compressor, sources, now);
      setStep(cursor);
      setActiveSource(sourceIndex);
      cursor += 1;
      const interval = Math.round((values[0].pulse + values[1].pulse) / 2);
      timerRef.current = setTimeout(emit, interval);
    };
    emit();
  }

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    void contextRef.current?.close();
  }, []);

  return (
    <section className="border-y border-black/20">
      <div className="grid md:grid-cols-[1fr_auto_1fr]">
        {sources.map((source, index) => (
          <article className={`relative min-w-0 p-6 md:p-9 ${index === 1 ? "md:order-3" : ""}`} key={source.name}>
            <span className={`absolute inset-x-0 top-0 h-px bg-black transition-opacity ${playing && activeSource === index ? "opacity-100" : "opacity-0"}`} />
            <p className="text-[8px] uppercase tracking-[0.24em] text-black/35">Source {String(index + 1).padStart(2, "0")}</p>
            <h2 className="mt-5 text-3xl font-light tracking-[-0.045em] md:text-5xl">{source.name}</h2>
            <dl className="mt-10 grid grid-cols-2 gap-px bg-black/15 font-mono text-[8px] uppercase tracking-[0.12em]">
              <div className="bg-white p-4"><dt className="text-black/30">Archive works</dt><dd className="mt-3 text-lg text-black">{source.workCount}</dd></div>
              <div className="bg-white p-4"><dt className="text-black/30">Structures</dt><dd className="mt-3 text-lg text-black">{source.contractCount}</dd></div>
              <div className="bg-white p-4"><dt className="text-black/30">Root</dt><dd className="mt-3 text-black/65">{values[index]?.frequency.toFixed(1)} Hz</dd></div>
              <div className="bg-white p-4"><dt className="text-black/30">Cadence</dt><dd className="mt-3 text-black/65">{Math.round(values[index]?.pulse)} ms</dd></div>
            </dl>
            <p className="mt-7 truncate font-mono text-[7px] uppercase tracking-[0.13em] text-black/25">{source.witness}</p>
            <p className="mt-3 font-mono text-[7px] uppercase tracking-[0.13em] text-black/30">{source.observedWorkCount} currently observed / retained history remains audible</p>
          </article>
        ))}

        <div className="order-3 grid min-h-44 place-items-center border-y border-black/20 px-5 py-8 md:order-2 md:min-h-full md:w-44 md:border-x md:border-y-0">
          <div className="text-center">
            <div aria-hidden="true" className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-black/20">
              <span className={`block h-px bg-black transition-all duration-500 ${playing ? "w-12 rotate-45" : "w-5"}`} />
            </div>
            <p className="mt-6 font-mono text-[7px] uppercase tracking-[0.18em] text-black/35">Fold {String(step + 1).padStart(3, "0")}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 border-t border-black/20 p-6 md:grid-cols-[1fr_auto] md:items-center md:p-9">
        <div>
          <p className="text-[9px] uppercase tracking-[0.24em]">One archive / two source voices</p>
          <p className="mt-3 max-w-2xl text-xs leading-6 text-black/45">Each wallet contributes its current work count, contract density, evidence sequence, and independent state witness. Heard together, both voices sound at once and generate a third relational voice from their interval, harmonic tension, and shared cadence. The centered stereo result is the state carried into The Record.</p>
        </div>
        <button className="min-w-36 border border-black px-6 py-4 text-[8px] uppercase tracking-[0.22em]" onClick={playing ? stop : play} type="button">{playing ? "Silence" : "Witness"}</button>
      </div>
    </section>
  );
}
