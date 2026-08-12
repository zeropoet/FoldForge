"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import displacementMap from "../../public/root-logos-living-object-displacement.json";
import { admitLibraryTrack, listLibraryTracks, removeLibraryTrack, renderMaster, type LibraryTrack, type SonicMaster } from "./sonic-audio";
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
  const masterAudioRef = useRef<HTMLAudioElement>(null);
  const sourceUrl = useRef<string | null>(null);
  const masterUrl = useRef<string | null>(null);
  const graphRef = useRef<SonicGraph | null>(null);
  const animationRef = useRef<number | null>(null);
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
  const [master, setMaster] = useState<SonicMaster | null>(null);
  const [masterAudioUrl, setMasterAudioUrl] = useState("");
  const [masterSignature, setMasterSignature] = useState("");
  const [rendering, setRendering] = useState(false);
  const [masterPlaying, setMasterPlaying] = useState(false);
  const [library, setLibrary] = useState<LibraryTrack[]>([]);

  useEffect(() => () => {
    if (sourceUrl.current) URL.revokeObjectURL(sourceUrl.current);
    if (masterUrl.current) URL.revokeObjectURL(masterUrl.current);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    void graphRef.current?.context.close();
  }, []);

  useEffect(() => { void listLibraryTracks().then(setLibrary).catch(() => setStatus("Local library unavailable")); }, []);

  const currentSignature = `${evidence?.name ?? ""}:${clarity}:${displacement}:${synthesis}:${phaseStretch}`;
  const masterIsCurrent = Boolean(master && masterSignature === currentSignature);

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
    graph.presence.gain.setTargetAtTime(c * 4.5, now, 0.03);
    graph.compressor.threshold.setTargetAtTime(-10 - c * 22, now, 0.03);
    graph.compressor.ratio.setTargetAtTime(1 + c * 4.5, now, 0.03);
    graph.delay.delayTime.setTargetAtTime(0.008 + d * 0.055, now, 0.03);
    graph.feedback.gain.setTargetAtTime(d * 0.26, now, 0.03);
    graph.wet.gain.setTargetAtTime(d * 0.46, now, 0.03);
    graph.synth.gain.setTargetAtTime(s * 0.38, now, 0.03);
    graph.panner.pan.setTargetAtTime(0, now, 0.02);
    graph.output.gain.setTargetAtTime(sculpted ? 0.88 : 1, now, 0.03);
  }, []);

  useEffect(() => {
    if (graphRef.current) updateGraph(graphRef.current, monitor, clarity, displacement, synthesis);
  }, [clarity, displacement, monitor, synthesis, updateGraph]);

  useEffect(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    const tick = () => {
      const audio = audioRef.current;
      const graph = graphRef.current;
      if (!audio || !graph || audio.paused || monitor !== "sculpted") return;
      const linear = clamp(audio.currentTime / Math.max(audio.duration, 0.001), 0, 1);
      const curve = 0.45 + phaseStretch / 100 * 1.1;
      const position = linear ** (1 / curve);
      const samplePosition = position * (displacementMap.samples.length - 1);
      const left = Math.floor(samplePosition);
      const right = Math.min(displacementMap.samples.length - 1, left + 1);
      const mix = samplePosition - left;
      const interpolate = (key: "depthDisplacement" | "energyDisplacement") => displacementMap.samples[left][key] + (displacementMap.samples[right][key] - displacementMap.samples[left][key]) * mix;
      const amount = displacement / 100;
      const now = graph.context.currentTime;
      graph.panner.pan.setTargetAtTime(0, now, 0.02);
      graph.delay.delayTime.setTargetAtTime(0.008 + Math.abs(interpolate("depthDisplacement")) * amount * 0.42, now, 0.035);
      graph.wet.gain.setTargetAtTime(clamp((0.24 + interpolate("energyDisplacement") * 0.13) * amount, 0.03, 0.5), now, 0.035);
      animationRef.current = requestAnimationFrame(tick);
    };
    if (playing && monitor === "sculpted") animationRef.current = requestAnimationFrame(tick);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [displacement, monitor, phaseStretch, playing]);

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
    schema: "foldforge-sonic-witness/v1",
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
    master: masterIsCurrent ? master?.metrics ?? null : null,
    authority: "Local browser session; no source upload or autonomous library admission.",
  }), [clarity, displacement, evidence, master, masterIsCurrent, phaseStretch, synthesis]);

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

  const createMaster = async () => {
    if (!audioBuffer || rendering) return;
    audioRef.current?.pause();
    masterAudioRef.current?.pause();
    setRendering(true);
    setStatus("Rendering witnessed 48 kHz / 24-bit master");
    try {
      const rendered = await renderMaster(audioBuffer, { clarity, displacement, synthesis, phaseStretch });
      if (masterUrl.current) URL.revokeObjectURL(masterUrl.current);
      masterUrl.current = URL.createObjectURL(rendered.blob);
      setMasterAudioUrl(masterUrl.current);
      setMaster(rendered);
      setMasterSignature(currentSignature);
      setStatus("Master rendered locally / review before admission");
    } catch {
      setStatus("Master render failed in this browser");
    } finally {
      setRendering(false);
    }
  };

  const downloadMaster = () => {
    if (!master || !masterIsCurrent || !masterAudioUrl || !evidence) return;
    const anchor = document.createElement("a");
    anchor.href = masterAudioUrl;
    anchor.download = `${evidence.name.replace(/\.[^.]+$/, "")}-sonic-forge-master.wav`;
    anchor.click();
  };

  const admitMaster = async () => {
    if (!master || !masterIsCurrent || !evidence) return;
    const id = master.metrics.sha256;
    await admitLibraryTrack({ id, title: evidence.name.replace(/\.[^.]+$/, ""), createdAt: new Date().toISOString(), audio: master.blob, witness, metrics: master.metrics });
    setLibrary(await listLibraryTracks());
    setStatus("Master admitted to this browser's private Sonic Forge library");
  };

  const removeTrack = async (id: string) => {
    await removeLibraryTrack(id);
    setLibrary(await listLibraryTracks());
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
              <Stage id="displace" active={activeStage === "displace"} label="02 / Displace" description="Traverse witnessed depth and energy while remaining centered." value={displacement} onActivate={() => setActiveStage("displace")} onChange={setDisplacement} />
              <Stage id="synthesize" active={activeStage === "synthesize"} label="03 / Synthesize" description="Introduce new harmonic material; 0% adds none." value={synthesis} onActivate={() => setActiveStage("synthesize")} onChange={setSynthesis} />
            </section>

            <section className="mt-12 border-y border-white/20 py-8"><div className="flex flex-wrap items-end justify-between gap-6"><div><p className="text-[9px] uppercase tracking-[0.25em] text-white/40">FoldForge progression / temporal score</p><h2 className="mt-3 text-3xl font-light tracking-[-0.04em]">Stretch the archive through the sound</h2></div><label className="w-full max-w-xs text-[8px] uppercase tracking-[0.18em] text-white/45">Timeline stretch / {phaseStretch}<input className="mt-3 w-full" type="range" min="0" max="100" value={phaseStretch} onChange={(event) => setPhaseStretch(Number(event.target.value))} /></label></div><div className="sonic-timeline mt-10 grid grid-cols-2 gap-px bg-white/20 md:grid-cols-6">{phases.map(([name, description], index) => <div className="bg-black p-4" key={name} style={{ minHeight: `${120 + Math.abs(phaseStretch - 50) * (index % 2 ? .7 : .25)}px` }}><span className="font-mono text-[8px] text-white/25">{String(index + 1).padStart(2, "0")}</span><h3 className="mt-8 text-sm uppercase tracking-[0.12em]">{name}</h3><p className="mt-2 text-[10px] leading-4 text-white/35">{description}</p></div>)}</div></section>

            <section className="mt-12 border border-white/25">
              <div className="grid gap-8 p-6 md:grid-cols-[1fr_auto] md:items-end md:p-8"><div><p className="text-[9px] uppercase tracking-[0.24em] text-white/40">Master chamber</p><h2 className="mt-3 text-3xl font-light tracking-[-0.04em]">Seal this progression into sound</h2><p className="mt-4 max-w-2xl text-sm leading-6 text-white/55">Offline rendering traverses the complete witnessed displacement field, normalizes for laptop playback, and encodes a lossless 48 kHz / 24-bit stereo WAV. Every control change invalidates the previous render.</p></div><button disabled={rendering} className="border border-white px-6 py-4 text-[9px] uppercase tracking-[0.2em] hover:bg-white hover:text-black" onClick={() => void createMaster()}>{rendering ? "Rendering progression…" : master ? "Render again" : "Render master"}</button></div>
              {master && masterIsCurrent ? <div className="border-t border-white/20"><div className="sonic-waveform relative flex h-36 items-center gap-px overflow-hidden px-4" aria-label="Master waveform">{master.waveform.map((value, index) => <span key={index} style={{ height: `${Math.max(1, value * 100)}%` }} />)}</div><div className="grid grid-cols-2 border-t border-white/20 md:grid-cols-6"><Metric label="Format" value="WAV / I24" /><Metric label="Rate" value="48.0k" /><Metric label="Peak" value={`${master.metrics.peakDbfs} dB`} /><Metric label="Est. loudness" value={`${master.metrics.estimatedLufs} LUFS`} /><Metric label="Size" value={`${(master.metrics.bytes / 1_048_576).toFixed(1)} MB`} /><Metric label="Witness" value={master.metrics.sha256.slice(0, 10)} /></div><div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/20 p-4"><div className="flex flex-wrap gap-2"><button className="border border-white px-5 py-3 text-[9px] uppercase tracking-[0.18em]" onClick={() => { audioRef.current?.pause(); if (masterAudioRef.current?.paused) void masterAudioRef.current.play(); else masterAudioRef.current?.pause(); }}>{masterPlaying ? "Pause master" : "Witness master"}</button><button className="border border-white/35 px-5 py-3 text-[9px] uppercase tracking-[0.18em]" onClick={downloadMaster}>Download WAV</button><button className="border border-white/35 px-5 py-3 text-[9px] uppercase tracking-[0.18em]" onClick={exportWitness}>Download witness</button></div><button className="bg-white px-5 py-3 text-[9px] uppercase tracking-[0.18em] text-black" onClick={() => void admitMaster()}>Admit to private library</button><audio ref={masterAudioRef} src={masterAudioUrl} onPause={() => setMasterPlaying(false)} onPlay={() => setMasterPlaying(true)} /></div></div> : master ? <div className="border-t border-white/20 p-5 font-mono text-[8px] uppercase tracking-[0.15em] text-white/35">Recipe changed / render a new master before review or admission</div> : null}
            </section>
          </>
        )}

        <section className="mt-14 border-t border-white/20 pt-8"><div className="flex items-end justify-between gap-6"><div><p className="text-[9px] uppercase tracking-[0.25em] text-white/40">Private Sonic Forge library</p><h2 className="mt-3 text-3xl font-light tracking-[-0.04em]">Admitted masters / {library.length.toString().padStart(2, "0")}</h2></div><p className="max-w-sm text-right font-mono text-[8px] uppercase leading-4 tracking-[0.14em] text-white/25">Stored only in this browser / not deployed / removable</p></div>{library.length ? <div className="mt-8 border-x border-white/20">{library.map((track, index) => <article className="grid gap-5 border-b border-white/20 p-5 md:grid-cols-[50px_1fr_auto] md:items-center" key={track.id}><span className="font-mono text-[8px] text-white/25">M/{String(index + 1).padStart(2, "0")}</span><div className="min-w-0"><h3 className="truncate text-lg font-light">{track.title}</h3><p className="mt-2 font-mono text-[8px] uppercase tracking-[0.13em] text-white/30">{track.metrics.sampleRate / 1000} kHz / {track.metrics.bitDepth}-bit / {track.metrics.estimatedLufs} LUFS / {track.id.slice(0, 12)}</p></div><div className="flex gap-2"><button className="border border-white/35 px-4 py-3 text-[8px] uppercase tracking-[0.16em]" onClick={() => { const url = URL.createObjectURL(track.audio); const audio = new Audio(url); audio.onended = () => URL.revokeObjectURL(url); void audio.play(); }}>Play</button><button className="px-3 py-3 text-[8px] uppercase tracking-[0.16em] text-white/35 hover:text-white" onClick={() => void removeTrack(track.id)}>Remove</button></div></article>)}</div> : <div className="mt-8 grid min-h-32 place-items-center border border-white/15 text-[9px] uppercase tracking-[0.2em] text-white/25">No masters admitted</div>}</section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="min-w-20 border-r border-white/20 p-4 last:border-r-0"><p className="text-[7px] uppercase tracking-[0.18em] text-white/30">{label}</p><p className="mt-2 whitespace-nowrap font-mono text-[10px]">{value}</p></div>; }

function Stage({ id, active, label, description, value, onActivate, onChange }: { id: string; active: boolean; label: string; description: string; value: number; onActivate: () => void; onChange: (value: number) => void }) { return <article className={`sonic-stage bg-black p-6 ${active ? "is-active" : ""}`}><button className="w-full text-left" onClick={onActivate}><p className="text-[9px] uppercase tracking-[0.22em] text-white/45">{label}</p><p className="mt-5 min-h-12 text-sm leading-6 text-white/55">{description}</p></button><label className="mt-8 block text-[8px] uppercase tracking-[0.18em] text-white/40" htmlFor={id}>Influence / {value}%</label><input className="mt-4 w-full" id={id} type="range" min="0" max="100" value={value} onFocus={onActivate} onChange={(event) => onChange(Number(event.target.value))} /></article>; }
