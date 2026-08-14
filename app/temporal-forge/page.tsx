"use client";

import { GIFEncoder, applyPalette, quantize } from "gifenc";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PublicHeader from "../public-header";
import { moveFrame, naturalFrameOrder, sequenceDuration, type SequenceFrame } from "./sequence";
import "./temporal-forge.css";

const EXPORT_SIZES = [720, 1080, 1440] as const;
type ExportSize = (typeof EXPORT_SIZES)[number];
type FrameBackground = "black" | "white";

const FRAME_BACKGROUNDS: Record<FrameBackground, string> = {
  black: "#000000",
  white: "#ffffff",
};
const MP4_MIME_TYPES = ["video/mp4;codecs=avc1.42E01E", "video/mp4;codecs=h264", "video/mp4"];

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

function drawFrame(context: CanvasRenderingContext2D, image: HTMLImageElement, size: number, background: string, inverted: boolean) {
  context.fillStyle = background;
  context.fillRect(0, 0, size, size);
  const scale = Math.min(size / image.naturalWidth, size / image.naturalHeight);
  const width = Math.round(image.naturalWidth * scale);
  const height = Math.round(image.naturalHeight * scale);
  const x = (size - width) / 2;
  const y = (size - height) / 2;
  if (!inverted) {
    context.drawImage(image, x, y, width, height);
    return;
  }

  const layer = document.createElement("canvas");
  layer.width = width;
  layer.height = height;
  const layerContext = layer.getContext("2d", { willReadFrequently: true });
  if (!layerContext) throw new Error("Canvas inversion is unavailable.");
  layerContext.drawImage(image, 0, 0, width, height);
  const pixels = layerContext.getImageData(0, 0, width, height);
  for (let index = 0; index < pixels.data.length; index += 4) {
    if (pixels.data[index + 3] === 0) continue;
    pixels.data[index] = 255 - pixels.data[index];
    pixels.data[index + 1] = 255 - pixels.data[index + 1];
    pixels.data[index + 2] = 255 - pixels.data[index + 2];
  }
  layerContext.putImageData(pixels, 0, 0);
  context.drawImage(layer, x, y);
}

function supportedMp4MimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  return MP4_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

export default function TemporalForge() {
  const inputRef = useRef<HTMLInputElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastTick = useRef(0);
  const framesRef = useRef<SequenceFrame[]>([]);
  const [frames, setFrames] = useState<SequenceFrame[]>([]);
  const [frameIndex, setFrameIndex] = useState(0);
  const [fps, setFps] = useState(8);
  const [exportSize, setExportSize] = useState<ExportSize>(720);
  const [frameBackground, setFrameBackground] = useState<FrameBackground>("black");
  const [inverted, setInverted] = useState(false);
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
      canvas.width = exportSize;
      canvas.height = exportSize;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("Canvas export is unavailable.");
      const gif = GIFEncoder({ initialCapacity: 1024 * 1024 });
      for (let index = 0; index < frames.length; index += 1) {
        setStatus(`Encoding frame ${index + 1} / ${frames.length}`);
        const image = await loadImage(frames[index].url);
        drawFrame(context, image, exportSize, FRAME_BACKGROUNDS[frameBackground], inverted);
        const rgba = context.getImageData(0, 0, exportSize, exportSize).data;
        const palette = quantize(rgba, 256, { format: "rgb444" });
        const indexed = applyPalette(rgba, palette, "rgb444");
        gif.writeFrame(indexed, exportSize, exportSize, { palette, delay: Math.round(1000 / fps), repeat: 0 });
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      }
      gif.finish();
      download(new Blob([gif.bytes().slice().buffer], { type: "image/gif" }), `Temporal-Forge-${sequenceId}.gif`);
      setStatus(`GIF rendered / ${exportSize} × ${exportSize} / ${frames.length} frames / ${fps} fps`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "GIF export failed.");
    } finally {
      setExporting(false);
    }
  };

  const exportMp4 = async () => {
    if (!frames.length) return;
    const mimeType = supportedMp4MimeType();
    if (!mimeType) {
      setStatus("MP4 encoding is unavailable in this browser. Try Safari or a current Chromium browser.");
      return;
    }
    setPlaying(false);
    setExporting(true);
    try {
      setStatus("Preparing MP4 frames…");
      const images = await Promise.all(frames.map((frame) => loadImage(frame.url)));
      const canvas = document.createElement("canvas");
      canvas.width = exportSize;
      canvas.height = exportSize;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas export is unavailable.");
      drawFrame(context, images[0], exportSize, FRAME_BACKGROUNDS[frameBackground], inverted);

      const stream = canvas.captureStream(0);
      const videoTrack = stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack;
      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: Math.min(20_000_000, Math.round(12_000_000 * (exportSize / 1080) ** 2)),
      });
      const stopped = new Promise<void>((resolve, reject) => {
        recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
        recorder.onerror = () => reject(new Error("MP4 encoding failed."));
        recorder.onstop = () => resolve();
      });

      recorder.start();
      const frameDuration = 1000 / fps;
      for (let index = 0; index < images.length; index += 1) {
        setStatus(`Encoding MP4 frame ${index + 1} / ${images.length}`);
        drawFrame(context, images[index], exportSize, FRAME_BACKGROUNDS[frameBackground], inverted);
        videoTrack.requestFrame();
        await new Promise<void>((resolve) => setTimeout(resolve, frameDuration));
      }
      recorder.stop();
      await stopped;
      stream.getTracks().forEach((track) => track.stop());
      download(new Blob(chunks, { type: mimeType }), `Temporal-Forge-${sequenceId}.mp4`);
      setStatus(`MP4 rendered / ${exportSize} × ${exportSize} / ${frames.length} frames / ${fps} fps`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "MP4 export failed.");
    } finally {
      setExporting(false);
    }
  };

  const exportWitness = () => {
    if (!frames.length) return;
    const witness = {
      schema: "foldforge-temporal-sequence-witness/v2",
      instrument: "Temporal Forge / v2",
      lineage: "Sovereign Standard / sigil-sequence / deterministic frame player",
      privacy: "local browser processing; source frames not uploaded",
      sequence: sequenceId,
      fps,
      loopDurationSeconds: duration,
      export: { formats: ["GIF89a", "MP4"], width: exportSize, height: exportSize, fit: "contain", background: FRAME_BACKGROUNDS[frameBackground], colorInversion: inverted },
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
        <div className="border border-white/20 p-5 font-mono text-[8px] uppercase leading-5 tracking-[0.14em] text-white/35">Local by default<br />Natural filename order on ingest<br />GIF89a + MP4 / up to 1440 × 1440<br />Witnessed source sequence</div>
      </section>

      {!frames.length ? <button className="mt-12 grid min-h-[430px] w-full place-items-center border border-dashed border-white/30 px-8 text-center hover:border-white" onClick={() => inputRef.current?.click()}><span><span className="block text-xl font-light">Admit collection frames</span><span className="mt-4 block font-mono text-[8px] uppercase tracking-[0.2em] text-white/35">Choose multiple PNG, JPEG, WebP, GIF, or SVG files</span></span></button> : <>
        <section className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="temporal-stage relative grid aspect-square max-h-[78vh] place-items-center overflow-hidden border border-white/20" style={{ backgroundColor: FRAME_BACKGROUNDS[frameBackground] }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt={current?.name || "Current sequence frame"} className="h-full w-full object-contain" src={current?.url} style={{ filter: inverted ? "invert(1)" : "none" }} />
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/75 p-4 font-mono text-[8px] uppercase tracking-[0.14em]"><span>{String(frameIndex + 1).padStart(4, "0")} / {String(frames.length).padStart(4, "0")}</span><span className="max-w-[60%] truncate text-white/45">{current?.name}</span></div>
          </div>
          <aside className="flex flex-col border border-white/20 p-5">
            <p className="text-[9px] uppercase tracking-[0.22em] text-white/40">Sequence state</p><p className="mt-4 text-3xl font-light">{duration.toFixed(2)} seconds</p><p className="mt-2 font-mono text-[8px] uppercase tracking-[0.15em] text-white/30">{frames.length} frames / {fps} fps / loop</p>
            <div className="mt-9 grid grid-cols-3 border border-white/25"><button className="p-4 text-sm" onClick={() => setFrameIndex((frameIndex - 1 + frames.length) % frames.length)} aria-label="Previous frame">←</button><button className="border-x border-white/25 p-4 text-[8px] uppercase tracking-[0.14em]" onClick={() => setPlaying((value) => !value)}>{playing ? "Pause" : "Play"}</button><button className="p-4 text-sm" onClick={() => setFrameIndex((frameIndex + 1) % frames.length)} aria-label="Next frame">→</button></div>
            <label className="mt-8 text-[8px] uppercase tracking-[0.18em] text-white/40">Cadence / {fps} fps<input className="mt-4 w-full" type="range" min="1" max="24" value={fps} onChange={(event) => setFps(Number(event.target.value))} /></label>
            <label className="mt-8 text-[8px] uppercase tracking-[0.18em] text-white/40">Frame / {frameIndex + 1}<input className="mt-4 w-full" type="range" min="0" max={frames.length - 1} value={frameIndex} onChange={(event) => { setPlaying(false); setFrameIndex(Number(event.target.value)); }} /></label>
            <fieldset className="mt-8">
              <legend className="text-[8px] uppercase tracking-[0.18em] text-white/40">Alpha background</legend>
              <div className="mt-4 grid grid-cols-2 border border-white/25">
                {(["black", "white"] as const).map((background) => <button aria-pressed={frameBackground === background} className="temporal-background-option px-4 py-3 text-[8px] uppercase tracking-[0.16em]" key={background} onClick={() => { setFrameBackground(background); setStatus(`${background[0].toUpperCase()}${background.slice(1)} alpha background selected`); }} type="button">{background}</button>)}
              </div>
            </fieldset>
            <fieldset className="mt-8">
              <legend className="text-[8px] uppercase tracking-[0.18em] text-white/40">Render size</legend>
              <div className="mt-4 grid grid-cols-3 border border-white/25">
                {EXPORT_SIZES.map((size) => <button aria-label={`${size} by ${size} pixels`} aria-pressed={exportSize === size} className="temporal-resolution-option px-2 py-3 text-[8px] uppercase tracking-[0.1em]" key={size} onClick={() => { setExportSize(size); setStatus(`${size} × ${size} render size selected`); }} type="button">{size}</button>)}
              </div>
            </fieldset>
            <button aria-pressed={inverted} className="temporal-inversion-option mt-8 flex items-center justify-between border border-white/25 px-4 py-3 text-[8px] uppercase tracking-[0.16em]" onClick={() => { const next = !inverted; setInverted(next); setStatus(`Color inversion ${next ? "enabled" : "disabled"}`); }} type="button"><span>Color inversion</span><span>{inverted ? "On" : "Off"}</span></button>
            <div className="mt-auto grid gap-2 pt-10"><button className="border border-white/40 px-5 py-4 text-[8px] uppercase tracking-[0.18em] disabled:opacity-35" disabled={exporting} onClick={() => void exportGif()}>{exporting ? "Rendering…" : "Render animated GIF"}</button><button className="border border-white/40 px-5 py-4 text-[8px] uppercase tracking-[0.18em] disabled:opacity-35" disabled={exporting} onClick={() => void exportMp4()} title="Render one sequence cycle as MP4">{exporting ? "Rendering…" : "Render MP4"}</button><button className="border border-white/20 px-5 py-4 text-[8px] uppercase tracking-[0.18em]" onClick={exportWitness}>Export sequence witness</button><button className="px-5 py-3 text-[8px] uppercase tracking-[0.18em] text-white/40" onClick={() => inputRef.current?.click()}>Replace frames</button></div>
          </aside>
        </section>
        <section className="mt-8"><div className="mb-4 flex justify-between font-mono text-[8px] uppercase tracking-[0.15em] text-white/35"><span>{status}</span><span>{sequenceId}</span></div><div className="temporal-strip flex gap-2 overflow-x-auto pb-3">{frames.map((frame, index) => <article aria-current={index === frameIndex} className="temporal-frame w-32 shrink-0 border border-white/15 p-2 opacity-55" key={frame.id}><button className="block w-full" onClick={() => { setPlaying(false); setFrameIndex(index); }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <span className="block aspect-square w-full" style={{ backgroundColor: FRAME_BACKGROUNDS[frameBackground] }}><img alt="" className="h-full w-full object-contain" src={frame.url} style={{ filter: inverted ? "invert(1)" : "none" }} /></span><span className="mt-2 block truncate text-left font-mono text-[7px] text-white/50">{String(index + 1).padStart(4, "0")} {frame.name}</span></button><div className="mt-2 grid grid-cols-2 gap-1"><button disabled={index === 0} className="border border-white/15 py-1 text-[8px] disabled:opacity-20" onClick={() => reorder(index, index - 1)}>←</button><button disabled={index === frames.length - 1} className="border border-white/15 py-1 text-[8px] disabled:opacity-20" onClick={() => reorder(index, index + 1)}>→</button></div></article>)}</div></section>
      </>}
      <input ref={inputRef} className="hidden" type="file" accept="image/*,.svg" multiple onChange={(event) => void ingest(event.target.files)} />
    </div>
  </main>;
}
