"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import PublicHeader from "../public-header";
import { composeCouplets, grammar, inspectCouplet, type Couplet, type EventState, type SystemTerm } from "./relation-grammar";
import "./relation-forge.css";

type ImageEvidence = { name: string; bytes: number; width: number; height: number; sha256: string };

async function inspectImage(file: File): Promise<ImageEvidence> {
  const bytes = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const sha256 = [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
  const bitmap = await createImageBitmap(file);
  const evidence = { name: file.name, bytes: file.size, width: bitmap.width, height: bitmap.height, sha256: `sha256:${sha256}` };
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

export default function RelationForge() {
  const inputRef = useRef<HTMLInputElement>(null);
  const sourceUrl = useRef<string | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [image, setImage] = useState<ImageEvidence | null>(null);
  const [event, setEvent] = useState<EventState>("placed");
  const [systemTerm, setSystemTerm] = useState<SystemTerm>("vessel");
  const [livedField, setLivedField] = useState("");
  const [evidenceText, setEvidenceText] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [couplets, setCouplets] = useState<Couplet[]>([]);
  const [selected, setSelected] = useState(0);
  const [editedLines, setEditedLines] = useState<[string, string]>(["", ""]);
  const [status, setStatus] = useState("Awaiting image");

  useEffect(() => () => { if (sourceUrl.current) URL.revokeObjectURL(sourceUrl.current); }, []);

  const evidence = useMemo(() => evidenceText.split("\n").map((line) => line.trim()).filter(Boolean), [evidenceText]);
  const constraints = useMemo(() => inspectCouplet(editedLines), [editedLines]);

  async function ingest(file?: File) {
    if (!file) return;
    setStatus("Reading local evidence");
    try {
      const inspected = await inspectImage(file);
      if (sourceUrl.current) URL.revokeObjectURL(sourceUrl.current);
      sourceUrl.current = URL.createObjectURL(file);
      setImageUrl(sourceUrl.current);
      setImage(inspected);
      setConfirmed(false);
      setCouplets([]);
      setEditedLines(["", ""]);
      setStatus("Image held locally / observation required");
    } catch {
      setStatus("The browser could not read this image");
    }
  }

  function compose() {
    if (!image || !confirmed || evidence.length === 0 || !livedField.trim()) return;
    const next = composeCouplets({ event, systemTerm, livedField, visibleEvidence: evidence, seed: image.sha256 });
    setCouplets(next);
    setSelected(0);
    setEditedLines(next[0]?.lines ?? ["", ""]);
    setStatus(`${next.length} witnessed relations composed`);
  }

  function choose(index: number) {
    setSelected(index);
    setEditedLines(couplets[index].lines);
  }

  const witness = image && couplets[selected] ? {
    schema: "foldforge-witness-couplet/v1",
    grammar: { id: grammar.id, version: grammar.version, root_logos_revision: grammar.rootLogosRevision },
    source: { ...image, bytes_retained: false },
    observation: { state: "human-confirmed", event, visible_evidence: evidence, lived_field: livedField.trim(), field_term: systemTerm },
    composition: { id: couplets[selected].id, movement: couplets[selected].movement, lines: editedLines, constraints },
    authority: "A composed relation, not the final meaning of the image.",
  } : null;

  return (
    <main className="relation-shell min-h-screen text-black">
      <PublicHeader active="relation" />

      <div className="mx-auto w-full max-w-[1600px] px-5 py-10 md:px-8 md:py-16">
      <section className="grid gap-10 border-b border-black/20 pb-12 lg:grid-cols-[1fr_0.75fr] lg:items-end">
        <div><p className="text-[9px] uppercase tracking-[0.25em] text-black/40">Confirmed observation / relation / utterance</p><h1 className="mt-5 max-w-3xl text-5xl font-light tracking-[-0.055em] md:text-7xl">Relation Forge</h1><p className="mt-7 max-w-2xl text-sm leading-7 text-black/55">Admit an image, confirm what it visibly supports, and compose a two-line witnessed relation without exhausting the source.</p></div>
        <div className="border border-black/20 p-5 font-mono text-[8px] uppercase leading-5 tracking-[0.14em] text-black/35">Private by default<br />Root Logos v1.4 constraints<br />Human-confirmed observation<br />{grammar.version}</div>
      </section>

      <div className="relation-grid mt-10 border border-black/20">
        <section className="border-b border-black/20 p-5 md:border-r md:border-b-0 md:p-8">
          <button className="relation-drop grid w-full place-items-center border border-black/20 text-left" onClick={() => inputRef.current?.click()} type="button">
            {imageUrl ? <>
              {/* Object URLs are local browser evidence and cannot pass through the Next image optimizer. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="Local source preview" className="relation-preview" src={imageUrl} />
            </> : <span className="font-mono text-[10px] uppercase tracking-[.2em] text-black/45">Admit local image</span>}
          </button>
          <input ref={inputRef} accept="image/*" className="hidden" onChange={(event) => void ingest(event.target.files?.[0])} type="file" />
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[9px] uppercase tracking-[.14em] text-black/34">
            <span>{status}</span>
            {image && <><span>{image.width} × {image.height}</span><span>{(image.bytes / 1_000_000).toFixed(2)} MB</span><span>{image.sha256.slice(7, 19)}</span></>}
          </div>
        </section>

        <section className="p-5 md:p-8">
          <p className="font-mono text-[9px] uppercase tracking-[.2em] text-black/42">01 / Confirm the witness</p>
          <label className="mt-8 block text-xs text-black/52">Visible evidence — one observable statement per line</label>
          <textarea className="relation-input min-h-28 resize-y" onChange={(event) => { setEvidenceText(event.target.value); setConfirmed(false); }} placeholder={"A black vessel rests beside an iron pot\nThe vessel is closed\nLight enters from the window"} value={evidenceText} />

          <div className="mt-7 grid grid-cols-2 gap-6">
            <label className="text-xs text-black/52">Event
              <select className="relation-input mt-2" onChange={(event) => setEvent(event.target.value as EventState)} value={event}>
                {(["received", "opened", "placed", "prepared", "returned", "held"] as EventState[]).map((value) => <option className="bg-white" key={value}>{value}</option>)}
              </select>
            </label>
            <label className="text-xs text-black/52">Field term
              <select className="relation-input mt-2" onChange={(event) => setSystemTerm(event.target.value as SystemTerm)} value={systemTerm}>
                {grammar.systemTerms.map((value) => <option className="bg-white" key={value}>{value}</option>)}
              </select>
            </label>
          </div>

          <label className="mt-7 block text-xs text-black/52">Lived field — the relation the object enters</label>
          <input className="relation-input" onChange={(event) => setLivedField(event.target.value)} placeholder="an established ritual" value={livedField} />

          <label className="mt-8 flex cursor-pointer items-start gap-3 border-t border-black/16 pt-6 text-xs leading-5 text-black/58">
            <input checked={confirmed} className="mt-1" onChange={(event) => setConfirmed(event.target.checked)} type="checkbox" />
            <span>I confirm these statements are visibly supported. Interpretation begins only after this boundary.</span>
          </label>
          <button className="mt-7 w-full border border-black bg-white px-5 py-4 font-mono text-[10px] uppercase tracking-[.2em] text-black disabled:border-black/20 disabled:bg-transparent disabled:text-black/25" disabled={!image || !confirmed || evidence.length === 0 || !livedField.trim()} onClick={compose} type="button">Compose witnessed relations</button>
        </section>
      </div>

      {couplets.length > 0 && <section className="grid border-b border-black/20 lg:grid-cols-[18rem_1fr]">
        <aside className="border-b border-black/20 p-5 lg:border-r lg:border-b-0 md:p-8">
          <p className="font-mono text-[9px] uppercase tracking-[.2em] text-black/42">02 / Select</p>
          <div className="mt-6 space-y-2">
            {couplets.map((couplet, index) => <button className={`w-full border px-4 py-3 text-left font-mono text-[9px] uppercase tracking-[.15em] ${selected === index ? "border-black text-black" : "border-black/16 text-black/38"}`} key={couplet.id} onClick={() => choose(index)} type="button">{String(index + 1).padStart(2, "0")} / {couplet.movement}</button>)}
          </div>
        </aside>
        <div className="p-5 md:p-8 lg:p-14">
          <p className="font-mono text-[9px] uppercase tracking-[.2em] text-black/42">03 / Human judgment</p>
          <div className="mt-9 max-w-4xl space-y-2">
            {editedLines.map((line, index) => <input aria-label={`Couplet line ${index + 1}`} className="relation-couplet w-full border-0 border-b border-black/14 bg-transparent py-3 text-black outline-none focus:border-black" key={index} onChange={(event) => setEditedLines((current) => index === 0 ? [event.target.value, current[1]] : [current[0], event.target.value])} value={line} />)}
          </div>
          <div className="mt-10 flex flex-wrap gap-2">
            {constraints.checks.map((check) => <span className={`border px-3 py-2 font-mono text-[8px] uppercase tracking-[.13em] ${check.passed ? "border-black/20 text-black/45" : "border-black text-black"}`} key={check.label}>{check.passed ? "✓" : "×"} {check.label}</span>)}
          </div>
          <div className="mt-9 flex flex-wrap gap-3">
            <button className="border border-black px-5 py-3 font-mono text-[9px] uppercase tracking-[.17em]" onClick={() => void navigator.clipboard.writeText(editedLines.join("\n"))} type="button">Copy couplet</button>
            <button className="border border-black/25 px-5 py-3 font-mono text-[9px] uppercase tracking-[.17em] text-black/58 disabled:opacity-30" disabled={!witness || !constraints.valid} onClick={() => witness && downloadJson(witness, `witness-couplet-${witness.composition.id}.json`)} type="button">Export witness</button>
          </div>
        </div>
      </section>}

      <footer className="grid gap-8 px-5 py-10 text-xs leading-5 text-black/42 md:grid-cols-3 md:px-8">
        <p><span className="text-black/68">Source fidelity.</span><br />Image bytes remain local and are never included in the exported witness.</p>
        <p><span className="text-black/68">Root Logos v1.4.</span><br />Reality remains greater than the system’s account of it.</p>
        <p><span className="text-black/68">Authority boundary.</span><br />A composed relation is not the final meaning of the image.</p>
      </footer>
      </div>
    </main>
  );
}
