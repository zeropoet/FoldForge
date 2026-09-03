"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import PublicHeader from "../public-header";
import { analyzePixels, type VisualSignature } from "../visual-analysis";
import {
  composeInstagramDrafts,
  inspectInstagramDraft,
  instagramGrammar,
  type ClosingMode,
  type InstagramDraft,
} from "./instagram-grammar";
import "./relation-forge.css";

type ImageEvidence = {
  name: string;
  type: string;
  bytes: number;
  width: number;
  height: number;
  sha256: string;
  visual: VisualSignature | null;
};

async function inspectImage(file: File): Promise<ImageEvidence> {
  const bytes = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const sha256 = [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const sample = 72;
  canvas.width = sample;
  canvas.height = sample;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context?.drawImage(bitmap, 0, 0, sample, sample);
  const pixels = context?.getImageData(0, 0, sample, sample).data;
  const evidence = {
    name: file.name,
    type: file.type || "image/unknown",
    bytes: file.size,
    width: bitmap.width,
    height: bitmap.height,
    sha256: `sha256:${sha256}`,
    visual: pixels ? analyzePixels(pixels, sample, sample) : null,
  };
  bitmap.close();
  return evidence;
}

function downloadJson(value: unknown, name: string) {
  const url = URL.createObjectURL(new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function visualField(signature: VisualSignature | null): string {
  if (!signature) return "unmeasured";
  const light = signature.luminance < 0.28 ? "low light" : signature.luminance > 0.68 ? "bright field" : "middle light";
  const contrast = signature.contrast > 0.42 ? "high contrast" : signature.contrast < 0.18 ? "soft contrast" : "measured contrast";
  const color = signature.chroma < 0.02 ? "quiet color" : "chromatic presence";
  return `${light} / ${contrast} / ${color}`;
}

export default function RelationForge() {
  const inputRef = useRef<HTMLInputElement>(null);
  const sourceUrl = useRef<string | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [image, setImage] = useState<ImageEvidence | null>(null);
  const [subject, setSubject] = useState("");
  const [setting, setSetting] = useState("");
  const [light, setLight] = useState("");
  const [details, setDetails] = useState("");
  const [gesture, setGesture] = useState("");
  const [atmosphere, setAtmosphere] = useState("");
  const [productTruth, setProductTruth] = useState("");
  const [closing, setClosing] = useState<ClosingMode>("quiet");
  const [confirmed, setConfirmed] = useState(false);
  const [drafts, setDrafts] = useState<InstagramDraft[]>([]);
  const [selected, setSelected] = useState(0);
  const [caption, setCaption] = useState("");
  const [altText, setAltText] = useState("");
  const [composedAt, setComposedAt] = useState("");
  const [status, setStatus] = useState("Awaiting photograph");

  useEffect(() => () => { if (sourceUrl.current) URL.revokeObjectURL(sourceUrl.current); }, []);

  const inspection = useMemo(() => inspectInstagramDraft(caption, altText), [altText, caption]);
  const ready = Boolean(image && confirmed && subject.trim() && details.trim() && atmosphere.trim());

  async function ingest(file?: File) {
    if (!file) return;
    setStatus("Reading local image evidence");
    try {
      const inspected = await inspectImage(file);
      if (sourceUrl.current) URL.revokeObjectURL(sourceUrl.current);
      sourceUrl.current = URL.createObjectURL(file);
      setImageUrl(sourceUrl.current);
      setImage(inspected);
      setConfirmed(false);
      setDrafts([]);
      setCaption("");
      setAltText("");
      setComposedAt("");
      setStatus("Photograph held locally / observation required");
    } catch {
      setStatus("Use a browser-readable JPG, PNG, or WebP image");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function compose() {
    if (!image || !ready) return;
    const next = composeInstagramDrafts({ subject, setting, light, details, gesture, atmosphere, productTruth, closing, seed: image.sha256 });
    setDrafts(next);
    setSelected(0);
    setCaption(next[0].caption);
    setAltText(next[0].altText);
    setComposedAt(new Date().toISOString());
    setStatus("Three post movements composed / steward review required");
  }

  function choose(index: number) {
    setSelected(index);
    setCaption(drafts[index].caption);
    setAltText(drafts[index].altText);
  }

  const packet = image && drafts[selected] ? {
    schema: "foldforge-sovereign-instagram-draft/v1",
    id: `ss-instagram-draft-${drafts[selected].id}`,
    created_at: composedAt,
    status: "steward-review-required",
    channel: {
      account_handle: instagramGrammar.accountHandle,
      profile_destination: instagramGrammar.profileDestination,
      campaign: instagramGrammar.campaign,
    },
    source: {
      name: image.name,
      media_type: image.type,
      bytes: image.bytes,
      width: image.width,
      height: image.height,
      sha256: image.sha256,
      bytes_retained: false,
      visual_signature: image.visual,
    },
    observation: { state: "human-confirmed", subject, setting, light, details, gesture, atmosphere, product_truth: productTruth },
    post: { movement: drafts[selected].movement, caption, alt_text: altText },
    validation: inspection,
    authority: {
      preparation: "FoldForge Relation Forge",
      publication: "human-only",
      canonical_record_after_publication: "Sovereign Standard image asset + Telos post catalog",
    },
  } : null;

  return (
    <main className="relation-shell min-h-screen text-black">
      <PublicHeader active="relation" />
      <div className="mx-auto w-full max-w-[1600px] px-5 py-10 md:px-8 md:py-16">
        <section className="grid gap-10 border-b border-black/20 pb-12 lg:grid-cols-[1fr_0.75fr] lg:items-end">
          <div>
            <p className="text-[9px] uppercase tracking-[0.25em] text-black/40">Sovereign Standard / image-to-language boundary</p>
            <h1 className="mt-5 max-w-3xl text-5xl font-light tracking-[-0.055em] md:text-7xl">Relation Forge</h1>
            <p className="mt-7 max-w-2xl text-sm leading-7 text-black/55">Admit one photograph, confirm what it visibly holds, and compose a complete post for @sovereignstandardtea. The image remains local. Publication remains human.</p>
          </div>
          <div className="border border-black/20 p-5 font-mono text-[8px] uppercase leading-5 tracking-[0.14em] text-black/35">Private image ingest<br />Literal accessible description<br />Three tonal movements<br />{instagramGrammar.version} / steward approval</div>
        </section>

        <div className="relation-grid mt-10 border border-black/20">
          <section className="border-b border-black/20 p-5 md:border-r md:border-b-0 md:p-8">
            <button className="relation-drop grid w-full place-items-center border border-black/20 text-left" onClick={() => inputRef.current?.click()} type="button">
              {/* Object URLs are local browser evidence and cannot pass through the Next image optimizer. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {imageUrl ? <img alt="Local source preview" className="relation-preview" src={imageUrl} /> : <span className="font-mono text-[10px] uppercase tracking-[.2em] text-black/45">Admit local photograph</span>}
            </button>
            <input ref={inputRef} accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => void ingest(event.target.files?.[0])} type="file" />
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[9px] uppercase tracking-[.14em] text-black/34">
              <span>{status}</span>
              {image && <><span>{image.width} × {image.height}</span><span>{(image.bytes / 1_000_000).toFixed(2)} MB</span><span>{image.sha256.slice(7, 19)}</span></>}
            </div>
            {image?.visual && <p className="mt-3 font-mono text-[8px] uppercase tracking-[.14em] text-black/28">Local visual field / {visualField(image.visual)}</p>}
          </section>

          <section className="p-5 md:p-8">
            <p className="font-mono text-[9px] uppercase tracking-[.2em] text-black/42">01 / Confirm the photograph</p>
            <div className="mt-7 grid gap-6">
              <label className="relation-label">Primary subject <input className="relation-input" onChange={(event) => { setSubject(event.target.value); setConfirmed(false); }} placeholder="Open Sovereign Standard black tea tin beside its engraved lid" value={subject} /></label>
              <div className="grid gap-6 sm:grid-cols-2">
                <label className="relation-label">Setting <input className="relation-input" onChange={(event) => { setSetting(event.target.value); setConfirmed(false); }} placeholder="on a dark table" value={setting} /></label>
                <label className="relation-label">Light <input className="relation-input" onChange={(event) => { setLight(event.target.value); setConfirmed(false); }} placeholder="soft morning light" value={light} /></label>
              </div>
              <label className="relation-label">Visible details <textarea className="relation-input min-h-20 resize-y" onChange={(event) => { setDetails(event.target.value); setConfirmed(false); }} placeholder="A wooden scoop rests across loose leaves while a white mug waits nearby" value={details} /></label>
              <div className="grid gap-6 sm:grid-cols-2">
                <label className="relation-label">Ritual gesture <input className="relation-input" onChange={(event) => setGesture(event.target.value)} placeholder="the first pour" value={gesture} /></label>
                <label className="relation-label">Atmospheric field <input className="relation-input" onChange={(event) => setAtmosphere(event.target.value)} placeholder="Ritual as a way of keeping time" value={atmosphere} /></label>
              </div>
              <label className="relation-label">Product truth / optional <input className="relation-input" onChange={(event) => setProductTruth(event.target.value)} placeholder="The composed green tea waits for water and measured attention" value={productTruth} /></label>
              <label className="relation-label">Closing
                <select className="relation-input" onChange={(event) => setClosing(event.target.value as ClosingMode)} value={closing}>
                  <option value="quiet">No call to action</option>
                  <option value="brand">Sovereign Standard.</option>
                  <option value="profile">Collection through the link in profile.</option>
                </select>
              </label>
            </div>
            <label className="mt-8 flex cursor-pointer items-start gap-3 border-t border-black/16 pt-6 text-xs leading-5 text-black/58">
              <input checked={confirmed} className="mt-1" onChange={(event) => setConfirmed(event.target.checked)} type="checkbox" />
              <span>I confirm the subject, setting, light, and details are visibly supported by this photograph.</span>
            </label>
            <button className="mt-7 w-full border border-black bg-black px-5 py-4 font-mono text-[10px] uppercase tracking-[.2em] text-white disabled:border-black/20 disabled:bg-transparent disabled:text-black/25" disabled={!ready} onClick={compose} type="button">Compose Instagram post</button>
          </section>
        </div>

        {drafts.length > 0 && <section className="grid border-b border-black/20 lg:grid-cols-[18rem_1fr]">
          <aside className="border-b border-black/20 p-5 md:p-8 lg:border-r lg:border-b-0">
            <p className="font-mono text-[9px] uppercase tracking-[.2em] text-black/42">02 / Choose movement</p>
            <div className="mt-6 space-y-2">
              {drafts.map((draft, index) => <button className={`w-full border px-4 py-3 text-left font-mono text-[9px] uppercase tracking-[.15em] ${selected === index ? "border-black bg-black text-white" : "border-black/16 text-black/38"}`} key={draft.id} onClick={() => choose(index)} type="button">{String(index + 1).padStart(2, "0")} / {draft.movement}</button>)}
            </div>
            <p className="mt-8 text-xs leading-6 text-black/42">Stillness follows light. Ritual follows gesture. Relation follows the objects gathered in the frame.</p>
          </aside>
          <div className="p-5 md:p-8 lg:p-14">
            <p className="font-mono text-[9px] uppercase tracking-[.2em] text-black/42">03 / Human judgment</p>
            <label className="mt-8 block text-[9px] uppercase tracking-[.18em] text-black/38">Caption<textarea aria-label="Instagram caption" className="relation-caption" onChange={(event) => setCaption(event.target.value)} value={caption} /></label>
            <label className="mt-8 block text-[9px] uppercase tracking-[.18em] text-black/38">Alt text<textarea aria-label="Instagram alt text" className="relation-alt" onChange={(event) => setAltText(event.target.value)} value={altText} /></label>
            <div className="mt-8 flex flex-wrap gap-2">
              {inspection.checks.map((check) => <span className={`border px-3 py-2 font-mono text-[8px] uppercase tracking-[.13em] ${check.passed ? "border-black/20 text-black/45" : "border-black text-black"}`} key={check.label}>{check.passed ? "✓" : "×"} {check.label}</span>)}
            </div>
            <div className="mt-9 flex flex-wrap gap-3">
              <button className="border border-black px-5 py-3 font-mono text-[9px] uppercase tracking-[.17em]" onClick={() => void navigator.clipboard.writeText(caption)} type="button">Copy caption</button>
              <button className="border border-black px-5 py-3 font-mono text-[9px] uppercase tracking-[.17em]" onClick={() => void navigator.clipboard.writeText(altText)} type="button">Copy alt text</button>
              <button className="border border-black/25 px-5 py-3 font-mono text-[9px] uppercase tracking-[.17em] text-black/58 disabled:opacity-30" disabled={!packet || !inspection.valid} onClick={() => packet && downloadJson(packet, `${packet.id}.json`)} type="button">Export draft packet</button>
            </div>
          </div>
        </section>}

        <footer className="grid gap-8 px-0 py-10 text-xs leading-5 text-black/42 md:grid-cols-3">
          <p><span className="text-black/68">Image boundary.</span><br />The photograph never leaves this browser and is not embedded in the draft packet.</p>
          <p><span className="text-black/68">Language boundary.</span><br />Visible fact grounds the caption; poetry may deepen it without replacing what is there.</p>
          <p><span className="text-black/68">Publication boundary.</span><br />Relation Forge prepares. The steward chooses, posts, and admits the final public record.</p>
        </footer>
      </div>
    </main>
  );
}
