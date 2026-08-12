"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import displacementMap from "../../public/root-logos-living-object-displacement.json";
import "./sonic-forge.css";

type AudioEvidence = {
  name: string;
  bytes: number;
  duration: number;
  sampleRate: number;
  channels: number;
  peak: number;
  rms: number;
  waveform: number[];
};

type SonicGraph = {
  context: AudioContext;
  source: MediaElementAudioSourceNode;
  input: GainNode;
  dry: GainNode;
  highpass: BiquadFilterNode;
  presence: BiquadFilterNode;
  compressor: DynamicsCompressorNode;
  delay: DelayNode;
  feedback: GainNode;
  wet: GainNode;
  shaper: WaveShaperNode;
  synth: GainNode;
  panner: StereoPannerNode;
  sculpt: GainNode;
  output: GainNode;
};

const phases = [
  ["Ground", "Source fidelity and tonal center"],
  ["Fold", "Relations turn inward"],
  ["Recurrence", "Memory returns through the source"],
  ["Fracture", "Space separates without replacing pitch"],
  ["Convergence", "Displaced fields resolve"],
  ["Silence", "The source releases"],
] as const;

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
};

const db = (value: number) => value > 0 ? 20 * Math.log10(value) : -Infinity;
const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));

async function inspectAudio(file: File): Promise<{ evidence: AudioEvidence; buffer: AudioBuffer }> {
  const context = new AudioContext();
  try {
    const buffer = await context.decodeAudioData(await file.arrayBuffer());
    const buckets = 360;
    const waveform = Array.from({ length: buckets }, () => 0);
    let peak = 0;
    let sum = 0;
    let count = 0;
    for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
      const data = buffer.getChannelData(channel);
      for (let index = 0; index < data.length; index += 1) {
        const amplitude = Math.abs(data[index]);
        peak = Math.max(peak, amplitude);
        sum += data[index] ** 2;
        count += 1;
        const bucket = Math.min(buckets - 1, Math.floor(index / data.length * buckets));
        waveform[bucket] = Math.max(waveform[bucket], amplitude);
      }
    }
    return {
      buffer,
      evidence: {
        name: file.name,
        bytes: file.size,
        duration: buffer.duration,
        sampleRate: buffer.sampleRate,
        channels: buffer.numberOfChannels,
        peak,
        rms: Math.sqrt(sum / Math.max(1, count)),
        waveform,
      },
    };
  } finally {
    await context.close();
  }
}

export default function SonicForge() {
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const sourceUrl = useRef<string | null>(null);
  const graphRef = useRef<SonicGraph | null>(null);
  const [evidence, setEvidence] = useState<AudioEvidence | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [status, setStatus] = useState("Awaiting source");
  const [activeStage, setActiveStage] = useState<"clarify" | "displace" | "synthesize">("clarify");
  const [clarity, setClarity] = useState(32);
  const [displacement, setDisplacement] = useState(28);
  const [synthesis, setSynthesis] = useState(0);
  const [phaseStretch, setPhaseStretch] = useState(50);
  const [playing, setPlaying] = useState(false);
  const [monitor, setMonitor] = useState<"source" | "sculpted">("sculpted");

  useEffect(() => () => {
    if (sourceUrl.current) URL.revokeObjectURL(sourceUrl.current);
    void graphRef.current?.context.close();
  }, []);

  const updateGraph = useCallback((graph: SonicGraph, mode: "source" | "sculpted", clarifyValue: number, displacementValue: number, synthesisValue: number) => {
    const now = graph.context.currentTime;
    const sculpted = mode === "sculpted";
    const c = sculpted ? clarifyValue / 100 : 0;
    const d = sculpted ? displacementValue / 100 : 0;
    const s = sculpted ? synthesisValue / 100 : 0;
    graph.dry.gain.setTargetAtTime(sculpted ? 0 : 1, now, 0.015);
    graph.sculpt.gain.setTargetAtTime(sculpted ? 1 : 0, now, 0.015);
    graph.highpass.frequency.setTargetAtTime(20 + c * 55, now, 0.03);
    graph.presence.frequency.setTargetAtTime(2_400 + c * 1_300, now, 0.03);
    graph.presence.gain.setTargetAtTime(c * 2.4, now, 0.03);
    graph.compressor.threshold.setTargetAtTime(-8 - c * 18, now, 0.03);
    graph.compressor.ratio.setTargetAtTime(1 + c * 2.8, now, 0.03);
    graph.delay.delayTime.setTargetAtTime(0.006 + d * 0.034, now, 0.03);
    graph.feedback.gain.setTargetAtTime(d * 0.18, now, 0.03);
    graph.wet.gain.setTargetAtTime(d * 0.3, now, 0.03);
    graph.synth.gain.setTargetAtTime(s * 0.28, now, 0.03);
    const witnessSample = displacementMap.samples[Math.min(displacementMap.samples.length - 1, Math.round(d * (displacementMap.samples.length - 1)))];
    graph.panner.pan.setTargetAtTime(clamp(witnessSample.horizontalDisplacement * d * 2.4, -0.7, 0.7), now, 0.08);
    graph.output.gain.setTargetAtTime(sculpted ? 0.93 : 1, now, 0.03);
  }, []);

  useEffect(() => {
    if (graphRef.current) updateGraph(graphRef.current, monitor, clarity, displacement, synthesis);
  }, [clarity, displacement, monitor, synthesis, updateGraph]);

  const ingest = useCallback(async (file?: File) => {
    if (!file) return;
    setStatus("Reading sonic evidence");
    try {
      const inspected = await inspectAudio(file);
      if (sourceUrl.current) URL.revokeObjectURL(sourceUrl.current);
      sourceUrl.current = URL.createObjectURL(file);
      setAudioUrl(sourceUrl.current);
      setEvidence(inspected.evidence);
      setAudioBuffer(inspected.buffer);
      setStatus("Source held locally / ready to sculpt");
    } catch {
      setStatus("The browser could not decode this source");
    }
  }, []);

  const witness = useMemo(() => ({
    schema: "foldforge-sonic-witness/v0.1",
    source: evidence ? {
      name: evidence.name,
      bytes: evidence.bytes,
      duration: Number(evidence.duration.toFixed(6)),
      sampleRate: evidence.sampleRate,
      channels: evidence.channels,
      peakDbfs: Number(db(evidence.peak).toFixed(2)),
      rmsDbfs: Number(db(evidence.rms).toFixed(2)),
    } : null,
    stages: { clarify: clarity, displace: displacement, synthesize: synthesis },
    timeline: { phases: phases.map(([name]) => name.toLowerCase()), stretch: phaseStretch },
    displacement: {
      schema: displacementMap.schema,
      witness: displacementMap.source.witness,
      samples: displacementMap.samples.length,
    },
    authority: "Local browser session; no source upload or autonomous library admission.",
  }), [clarity, displacement, evidence, phaseStretch, synthesis]);

  const exportWitness = () => {
    const blob = new Blob([`${JSON.stringify(witness, null, 2)}\n`], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `sonic-forge-${Date.now()}.witness.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const togglePlayback = async () => {
    if (!audioRef.current || !audioBuffer) return;
    if (!graphRef.current) {
      const context = new AudioContext({ sampleRate: 48_000 });
      const source = context.createMediaElementSource(audioRef.current);
      const input = context.createGain();
      const dry = context.createGain();
      const highpass = context.createBiquadFilter();
      highpass.type = "highpass";
      const presence = context.createBiquadFilter();
      presence.type = "peaking";
      presence.Q.value = 0.72;
      const compressor = context.createDynamicsCompressor();
      compressor.attack.value = 0.012;
      compressor.release.value = 0.22;
      compressor.knee.value = 16;
      const delay = context.createDelay(0.12);
      const feedback = context.createGain();
      const wet = context.createGain();
      const shaper = context.createWaveShaper();
      const curve = new Float32Array(8_192);
      for (let index = 0; index < curve.length; index += 1) {
        const x = index * 2 / (curve.length - 1) - 1;
        curve[index] = Math.tanh(x * 2.1);
      }
      shaper.curve = curve;
      shaper.oversample = "4x";
      const synth = context.createGain();
      const panner = context.createStereoPanner();
      const sculpt = context.createGain();
      const output = context.createGain();
      source.connect(input);
      input.connect(dry).connect(output);
      input.connect(highpass).connect(presence).connect(compressor).connect(panner).connect(sculpt).connect(output);
      compressor.connect(delay).connect(wet).connect(panner);
      delay.connect(feedback).connect(delay);
      compressor.connect(shaper).connect(synth).connect(panner);
      output.connect(context.destination);
      graphRef.current = { context, source, input, dry, highpass, presence, compressor, delay, feedback, wet, shaper, synth, panner, sculpt, output };
      updateGraph(graphRef.current, monitor, clarity, displacement, synthesis);
    }
    if (graphRef.current.context.state === "suspended") await graphRef.current.context.resume();
    if (audioRef.current.paused) await audioRef.current.play();
    else audioRef.current.pause();
  };

  return (
    <main className="sonic-shell min-h-screen bg-black text-white">
      <header className="site-header sticky top-0 z-20 border-b border-white/20 px-5 py-3 md:px-8">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-6">
          <Link className="flex min-w-0 items-center gap-3 sm:gap-4" href="/">
            <span className="brand-mark" aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="" src="/favicon.svg" />
            </span>
            <span><span className="block text-base font-medium uppercase tracking-[0.2em]">FoldForge</span><span className="mt-1 hidden text-[8px] uppercase tracking-[0.32em] text-white/40 sm:block">Sonic instrument / R&amp;D chamber</span></span>
          </Link>
          <nav className="flex gap-5 text-[9px] uppercase tracking-[0.2em]"><Link className="text-white/40 hover:text-white" href="/">Archive</Link><span>Sonic Forge</span></nav>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] px-5 py-10 md:px-8 md:py-14">
        <section className="grid gap-10 border-b border-white/20 pb-12 lg:grid-cols-[1.15fr_.85fr] lg:items-end">
          <div><p className="text-[9px] uppercase tracking-[0.28em] text-white/40">Instrument II / source → displaced master</p><h1 className="mt-5 text-6xl font-light uppercase tracking-[-0.065em] sm:text-8xl lg:text-[9rem] lg:leading-[.78]">Sonic<br />Forge</h1></div>
          <div className="max-w-xl lg:justify-self-end"><p className="text-lg font-light leading-8 text-white/65">Sound enters as evidence. Clarification repairs its field. Displacement moves it through FoldForge history. Synthesis begins only where the source permits.</p><p className="mt-6 font-mono text-[9px] uppercase leading-5 tracking-[0.14em] text-white/30">Private by default / reversible stages / witnessed output</p></div>
        </section>

        {!evidence ? (
          <section className="sonic-drop mt-10 grid min-h-[390px] place-items-center border border-dashed border-white/30 text-center" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void ingest(event.dataTransfer.files[0]); }}>
            <div><p className="text-[10px] uppercase tracking-[0.3em]">Place a sound into the field</p><p className="mt-4 text-xs text-white/40">WAV / AIFF / FLAC / M4A / MP3</p><button className="mt-8 border border-white px-6 py-4 text-[9px] uppercase tracking-[0.22em] hover:bg-white hover:text-black" onClick={() => inputRef.current?.click()}>Choose source</button><input ref={inputRef} className="sr-only" type="file" accept="audio/*" onChange={(event) => void ingest(event.target.files?.[0])} /><p className="mt-5 font-mono text-[8px] uppercase tracking-[0.15em] text-white/25">{status}</p></div>
          </section>
        ) : (
          <>
            <section className="mt-10 border border-white/25">
              <div className="grid border-b border-white/20 md:grid-cols-[1fr_auto] md:items-center"><div className="min-w-0 p-5 md:p-7"><p className="truncate text-xl font-light">{evidence.name}</p><p className="mt-2 font-mono text-[8px] uppercase tracking-[0.14em] text-white/35">{status}</p></div><div className="grid grid-cols-4 border-t border-white/20 md:border-l md:border-t-0"><Metric label="Duration" value={formatTime(evidence.duration)} /><Metric label="Rate" value={`${(evidence.sampleRate / 1000).toFixed(1)}k`} /><Metric label="Field" value={evidence.channels === 1 ? "Mono" : `${evidence.channels}ch`} /><Metric label="Peak" value={`${db(evidence.peak).toFixed(1)} dB`} /></div></div>
              <div className="sonic-waveform relative flex h-52 items-center gap-px overflow-hidden px-4" aria-label="Source waveform">{evidence.waveform.map((value, index) => <span key={index} style={{ height: `${Math.max(1, value * 100)}%` }} />)}<div className="sonic-scan" /></div>
              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/20 p-4"><div className="flex flex-wrap gap-2"><button className="border border-white px-5 py-3 text-[9px] uppercase tracking-[0.2em]" onClick={() => void togglePlayback()}>{playing ? "Pause" : "Witness sound"}</button><div className="flex border border-white/30"><button aria-pressed={monitor === "source"} className={`px-4 py-3 text-[8px] uppercase tracking-[0.17em] ${monitor === "source" ? "bg-white text-black" : "text-white/45"}`} onClick={() => setMonitor("source")}>Source</button><button aria-pressed={monitor === "sculpted"} className={`px-4 py-3 text-[8px] uppercase tracking-[0.17em] ${monitor === "sculpted" ? "bg-white text-black" : "text-white/45"}`} onClick={() => setMonitor("sculpted")}>Sculpted</button></div></div><button className="text-[9px] uppercase tracking-[0.18em] text-white/45 hover:text-white" onClick={() => { audioRef.current?.pause(); setEvidence(null); setAudioBuffer(null); setPlaying(false); }}>Replace source</button><audio ref={audioRef} src={audioUrl} onPause={() => setPlaying(false)} onPlay={() => setPlaying(true)} /></div>
            </section>

            <div className="mt-6 flex items-center gap-3 font-mono text-[8px] uppercase tracking-[0.15em] text-white/30"><span className={`h-1.5 w-1.5 ${playing && monitor === "sculpted" ? "bg-white" : "border border-white/50"}`} />{playing ? `${monitor} monitor active` : "Audio graph armed on first playback"}</div>
            <section className="mt-6 grid gap-px bg-white/20 lg:grid-cols-3">
              <Stage id="clarify" active={activeStage === "clarify"} label="01 / Clarify" description="Stabilize and reveal what the source already contains." value={clarity} onActivate={() => setActiveStage("clarify")} onChange={setClarity} />
              <Stage id="displace" active={activeStage === "displace"} label="02 / Displace" description="Move the intact source through witnessed spatial relations." value={displacement} onActivate={() => setActiveStage("displace")} onChange={setDisplacement} />
              <Stage id="synthesize" active={activeStage === "synthesize"} label="03 / Synthesize" description="Introduce new FoldForge material under explicit control." value={synthesis} onActivate={() => setActiveStage("synthesize")} onChange={setSynthesis} />
            </section>

            <section className="mt-12 border-y border-white/20 py-8"><div className="flex flex-wrap items-end justify-between gap-6"><div><p className="text-[9px] uppercase tracking-[0.25em] text-white/40">FoldForge progression / temporal score</p><h2 className="mt-3 text-3xl font-light tracking-[-0.04em]">Stretch the archive through the sound</h2></div><label className="w-full max-w-xs text-[8px] uppercase tracking-[0.18em] text-white/45">Timeline stretch / {phaseStretch}<input className="mt-3 w-full" type="range" min="0" max="100" value={phaseStretch} onChange={(event) => setPhaseStretch(Number(event.target.value))} /></label></div><div className="sonic-timeline mt-10 grid grid-cols-2 gap-px bg-white/20 md:grid-cols-6">{phases.map(([name, description], index) => <div className="bg-black p-4" key={name} style={{ minHeight: `${120 + Math.abs(phaseStretch - 50) * (index % 2 ? .7 : .25)}px` }}><span className="font-mono text-[8px] text-white/25">{String(index + 1).padStart(2, "0")}</span><h3 className="mt-8 text-sm uppercase tracking-[0.12em]">{name}</h3><p className="mt-2 text-[10px] leading-4 text-white/35">{description}</p></div>)}</div></section>

            <section className="mt-12 grid gap-8 border border-white/25 p-6 md:grid-cols-[1fr_auto] md:items-end md:p-8"><div><p className="text-[9px] uppercase tracking-[0.24em] text-white/40">Prototype witness</p><p className="mt-4 max-w-2xl text-sm leading-6 text-white/55">The current R&amp;D surface records intent and source measurements. Browser rendering and lossless master export are the next instrument layer; nothing enters the public library automatically.</p></div><button className="border border-white px-6 py-4 text-[9px] uppercase tracking-[0.2em] hover:bg-white hover:text-black" onClick={exportWitness}>Export recipe</button></section>
          </>
        )}
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="min-w-20 border-r border-white/20 p-4 last:border-r-0"><p className="text-[7px] uppercase tracking-[0.18em] text-white/30">{label}</p><p className="mt-2 whitespace-nowrap font-mono text-[10px]">{value}</p></div>; }

function Stage({ id, active, label, description, value, onActivate, onChange }: { id: string; active: boolean; label: string; description: string; value: number; onActivate: () => void; onChange: (value: number) => void }) { return <article className={`sonic-stage bg-black p-6 ${active ? "is-active" : ""}`}><button className="w-full text-left" onClick={onActivate}><p className="text-[9px] uppercase tracking-[0.22em] text-white/45">{label}</p><p className="mt-5 min-h-12 text-sm leading-6 text-white/55">{description}</p></button><label className="mt-8 block text-[8px] uppercase tracking-[0.18em] text-white/40" htmlFor={id}>Influence / {value}%</label><input className="mt-4 w-full" id={id} type="range" min="0" max="100" value={value} onFocus={onActivate} onChange={(event) => onChange(Number(event.target.value))} /></article>; }
