"use client";

import { GIFEncoder, applyPalette, quantize } from "gifenc";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PublicHeader from "../public-header";
import { moveFrame, naturalFrameOrder, sequenceDuration, type SequenceFrame } from "./sequence";
import "./temporal-forge.css";

const EXPORT_SIZE = 720;

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function digest(file: File): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("A frame could not be decoded."));
    image.src = source;
  });
}

export default function TemporalForge() {
  const inputRef = useRef<HTMLInputElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastTick = useRef(0);
  const framesRef = useRef<SequenceFrame[]>([]);
  const [frames, setFrames] = useState<SequenceFrame[]>([]);
  const [frameIndex, setFrameIndex] = useState(0);
  const [fps, setFps] = useState(8);
  const [playing, setPlaying] = useState(false);
  const [status, setStatus] = useState("Awaiting collection frames");
  const [exporting, setExporting] = useState(false);

  const current = frames[frameIndex];
  const duration = sequenceDuration(frames.length, fps);
  const sequenceId = useMemo(() => frames.length ? frames.map((frame) => frame.digest).join("").slice(0, 12) : "", [frames]);

  useEffect(() => { framesRef.current = frames; }, [frames]);

  useEffect(() => () => {
    framesRef.current.forEach((frame) => URL.revokeObjectURL(frame.url));
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
  }, []);

  useEffect(() => {
    if (!playing || frames.length < 2) return;
    lastTick.current = performance.now();
    const tick = (time: number) => {
      if (time - lastTick.current >= 1000 / fps) {
        const elapsed = time - lastTick.current;
        const advance = Math.max(1, Math.floor(elapsed / (1000 / fps)));
        setFrameIndex((index) => (index + advance) % framesRef.current.length);
        lastTick.current = time;
      }
      animationRef.current = requestAnimationFrame(tick);
    };
    animationRef.current = requestAnimationFrame(tick);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [fps, frames.length, playing]);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (!frames.length || event.target instanceof HTMLInputElement) return;
      if (event.key === " ") { event.preventDefault(); setPlaying((value) => !value); }
      if (event.key === "ArrowLeft") setFrameIndex((index) => (index - 1 + frames.length) % frames.length);
      if (event.key === "ArrowRight") setFrameIndex((index) => (index + 1) % frames.length);
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [frames.length]);

  const ingest = useCallback(async (files: FileList | null) => {
    if (!files?.length) return;
    setPlaying(false);
    setStatus("Reading frame evidence…");
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/") || /\.svg$/i.test(file.name));
    const admitted = await Promise.all(imageFiles.map(async (file, index) => ({
      id: `${file.name}:${file.size}:${file.lastModified}:${index}`,
      name: file.name,
      bytes: file.size,
      lastModified: file.lastModified,
      digest: await digest(file),
      url: URL.createObjectURL(file),
    })));
    framesRef.current.forEach((frame) => URL.revokeObjectURL(frame.url));
    const ordered = naturalFrameOrder(admitted);
    setFrames(ordered);
    setFrameIndex(0);
    setStatus(`${ordered.length} frames admitted / natural filename order`);
  }, []);

  const reorder = (from: number, to: number) => {
    setFrames((value) => moveFrame(value, from, to));
    setFrameIndex(to);
    setStatus("Sequence order revised");
  };

  const exportGif = async () => {
    if (!frames.length) return;
    setPlaying(false);
    setExporting(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = EXPORT_SIZE;
      canvas.height = EXPORT_SIZE;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("Canvas export is unavailable.");
      const gif = GIFEncoder({ initialCapacity: 1024 * 1024 });
      for (let index = 0; index < frames.length; index += 1) {
        setStatus(`Encoding frame ${index + 1} / ${frames.length}`);
        const image = await loadImage(frames[index].url);
        context.fillStyle = "#000";
        context.fillRect(0, 0, EXPORT_SIZE, EXPORT_SIZE);
        const scale = Math.min(EXPORT_SIZE / image.naturalWidth, EXPORT_SIZE / image.naturalHeight);
        const width = Math.round(image.naturalWidth * scale);
        const height = Math.round(image.naturalHeight * scale);
        context.drawImage(image, (EXPORT_SIZE - width) / 2, (EXPORT_SIZE - height) / 2, width, height);
        const rgba = context.getImageData(0, 0, EXPORT_SIZE, EXPORT_SIZE).data;
        const palette = quantize(rgba, 256, { format: "rgb444" });
        const indexed = applyPalette(rgba, palette, "rgb444");
        gif.writeFrame(indexed, EXPORT_SIZE, EXPORT_SIZE, { palette, delay: Math.round(1000 / fps), repeat: 0 });
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      }
      gif.finish();
      download(new Blob([gif.bytes().slice().buffer], { type: "image/gif" }), `Temporal-Forge-${sequenceId}.gif`);
      setStatus(`GIF rendered / ${frames.length} frames / ${fps} fps`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "GIF export failed.");
    } finally {
      setExporting(false);
    }
  };

  const exportWitness = () => {
    if (!frames.length) return;
    const witness = {
      schema: "foldforge-temporal-sequence-witness/v1",
      instrument: "Temporal Forge / v1",
      lineage: "Sovereign Standard / sigil-sequence / deterministic frame player",
      privacy: "local browser processing; source frames not uploaded",
      sequence: sequenceId,
      fps,
      loopDurationSeconds: duration,
      export: { format: "GIF89a", width: EXPORT_SIZE, height: EXPORT_SIZE, fit: "contain", background: "#000000" },
      frames: frames.map(({ name, bytes, lastModified, digest }, index) => ({ index, name, bytes, lastModified, sha256: digest })),
    };
    download(new Blob([JSON.stringify(witness, null, 2)], { type: "application/json" }), `Temporal-Forge-${sequenceId}-witness.json`);
    setStatus("Sequence witness exported");
  };

  return <main className="temporal-shell min-h-screen text-white">
    <PublicHeader active="temporal" subtitle="Visual time instrument" />
    <div className="mx-auto max-w-[1600px] px-5 py-10 md:px-8 md:py-16">
      <section className="grid gap-10 border-b border-white/20 pb-12 lg:grid-cols-[1fr_0.75fr] lg:items-end">
        <div><p className="text-[9px] uppercase tracking-[0.25em] text-white/40">Collection frames / temporal recurrence</p><h1 className="mt-5 max-w-3xl text-5xl font-light tracking-[-0.055em] md:text-7xl">Temporal Forge</h1><p className="mt-7 max-w-2xl text-sm leading-7 text-white/55">Sequence a collection as frames, watch its visual grammar accumulate through time, and render the observation as a loop with a verifiable order.</p></div>
        <div className="border border-white/20 p-5 font-mono text-[8px] uppercase leading-5 tracking-[0.14em] text-white/35">Local by default<br />Natural filename order on ingest<br />GIF89a / 720 × 720 / infinite loop<br />Witnessed source sequence</div>
      </section>

      {!frames.length ? <button className="mt-12 grid min-h-[430px] w-full place-items-center border border-dashed border-white/30 px-8 text-center hover:border-white" onClick={() => inputRef.current?.click()}><span><span className="block text-xl font-light">Admit collection frames</span><span className="mt-4 block font-mono text-[8px] uppercase tracking-[0.2em] text-white/35">Choose multiple PNG, JPEG, WebP, GIF, or SVG files</span></span></button> : <>
        <section className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="temporal-stage relative grid aspect-square max-h-[78vh] place-items-center overflow-hidden border border-white/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt={current?.name || "Current sequence frame"} className="h-full w-full object-contain" src={current?.url} />
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/75 p-4 font-mono text-[8px] uppercase tracking-[0.14em]"><span>{String(frameIndex + 1).padStart(4, "0")} / {String(frames.length).padStart(4, "0")}</span><span className="max-w-[60%] truncate text-white/45">{current?.name}</span></div>
          </div>
          <aside className="flex flex-col border border-white/20 p-5">
            <p className="text-[9px] uppercase tracking-[0.22em] text-white/40">Sequence state</p><p className="mt-4 text-3xl font-light">{duration.toFixed(2)} seconds</p><p className="mt-2 font-mono text-[8px] uppercase tracking-[0.15em] text-white/30">{frames.length} frames / {fps} fps / loop</p>
            <div className="mt-9 grid grid-cols-3 border border-white/25"><button className="p-4 text-sm" onClick={() => setFrameIndex((frameIndex - 1 + frames.length) % frames.length)} aria-label="Previous frame">←</button><button className="border-x border-white/25 p-4 text-[8px] uppercase tracking-[0.14em]" onClick={() => setPlaying((value) => !value)}>{playing ? "Pause" : "Play"}</button><button className="p-4 text-sm" onClick={() => setFrameIndex((frameIndex + 1) % frames.length)} aria-label="Next frame">→</button></div>
            <label className="mt-8 text-[8px] uppercase tracking-[0.18em] text-white/40">Cadence / {fps} fps<input className="mt-4 w-full" type="range" min="1" max="24" value={fps} onChange={(event) => setFps(Number(event.target.value))} /></label>
            <label className="mt-8 text-[8px] uppercase tracking-[0.18em] text-white/40">Frame / {frameIndex + 1}<input className="mt-4 w-full" type="range" min="0" max={frames.length - 1} value={frameIndex} onChange={(event) => { setPlaying(false); setFrameIndex(Number(event.target.value)); }} /></label>
            <div className="mt-auto grid gap-2 pt-10"><button className="border border-white/40 px-5 py-4 text-[8px] uppercase tracking-[0.18em] disabled:opacity-35" disabled={exporting} onClick={() => void exportGif()}>{exporting ? "Rendering…" : "Render animated GIF"}</button><button className="border border-white/20 px-5 py-4 text-[8px] uppercase tracking-[0.18em]" onClick={exportWitness}>Export sequence witness</button><button className="px-5 py-3 text-[8px] uppercase tracking-[0.18em] text-white/40" onClick={() => inputRef.current?.click()}>Replace frames</button></div>
          </aside>
        </section>
        <section className="mt-8"><div className="mb-4 flex justify-between font-mono text-[8px] uppercase tracking-[0.15em] text-white/35"><span>{status}</span><span>{sequenceId}</span></div><div className="temporal-strip flex gap-2 overflow-x-auto pb-3">{frames.map((frame, index) => <article aria-current={index === frameIndex} className="temporal-frame w-32 shrink-0 border border-white/15 p-2 opacity-55" key={frame.id}><button className="block w-full" onClick={() => { setPlaying(false); setFrameIndex(index); }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="" className="aspect-square w-full bg-black object-contain" src={frame.url} /><span className="mt-2 block truncate text-left font-mono text-[7px] text-white/50">{String(index + 1).padStart(4, "0")} {frame.name}</span></button><div className="mt-2 grid grid-cols-2 gap-1"><button disabled={index === 0} className="border border-white/15 py-1 text-[8px] disabled:opacity-20" onClick={() => reorder(index, index - 1)}>←</button><button disabled={index === frames.length - 1} className="border border-white/15 py-1 text-[8px] disabled:opacity-20" onClick={() => reorder(index, index + 1)}>→</button></div></article>)}</div></section>
      </>}
      <input ref={inputRef} className="hidden" type="file" accept="image/*,.svg" multiple onChange={(event) => void ingest(event.target.files)} />
    </div>
  </main>;
}
