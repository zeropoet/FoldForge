"use client";

import { DragEvent, useRef, useState } from "react";
import PublicHeader from "../public-header";
import { addressLines, fittedFontSize, parseShippingManifest, type ShippingManifest, type ShippingParty, type ShippingRecord } from "./shipping-manifest";
import "./dispatch.css";

async function digest(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash)).map((value) => value.toString(16).padStart(2, "0")).join("");
}

function ShippingLabel({ origin, shipment }: { origin: ShippingParty; shipment: ShippingRecord }) {
  const originLines = addressLines(origin.address);
  const recipientLines = addressLines(shipment.recipient.address);
  const recipientGap = recipientLines.length > 3 ? 7 : 9;
  return <svg aria-label={`Shipping label for ${shipment.recipient.name}, Black Tin Vessel ${String(shipment.vessel).padStart(3, "0")}`} className="dispatch-label-svg" role="img" viewBox="0 0 216 144" xmlns="http://www.w3.org/2000/svg">
    <rect fill="#fff" height="134" rx="4" stroke="#000" strokeWidth="0.55" width="206" x="5" y="5" />
    <text fontFamily="Helvetica, Arial, sans-serif" fontSize="5.2" fontWeight="700" x="10" y="15">FROM</text>
    <text fontFamily="Helvetica, Arial, sans-serif" fontSize={fittedFontSize(origin.name, 7, 34, 5.8)} fontWeight="700" x="10" y="26">{origin.name.toUpperCase()}</text>
    {originLines.map((line, index) => <text fontFamily="Helvetica, Arial, sans-serif" fontSize="6.2" key={`${line}-${index}`} x="10" y={36 + index * 7}>{line.toUpperCase()}</text>)}
    <line stroke="#000" strokeWidth="0.35" x1="10" x2="206" y1="62" y2="62" />
    <text fontFamily="Helvetica, Arial, sans-serif" fontSize="5.5" fontWeight="700" x="10" y="73">TO</text>
    <text fontFamily="Helvetica, Arial, sans-serif" fontSize={fittedFontSize(shipment.recipient.name, 11, 26, 7)} fontWeight="700" x="10" y="91">{shipment.recipient.name.toUpperCase()}</text>
    {recipientLines.map((line, index) => <text fontFamily="Helvetica, Arial, sans-serif" fontSize={fittedFontSize(line, 8.2, 40, 6.5)} key={`${line}-${index}`} x="10" y={104 + index * recipientGap}>{line.toUpperCase()}</text>)}
    <text fontFamily="Helvetica, Arial, sans-serif" fontSize="4.6" x="10" y="136">{shipment.shipment_id.toUpperCase()}</text>
    <text fontFamily="Helvetica, Arial, sans-serif" fontSize="5.5" fontWeight="700" textAnchor="end" x="206" y="136">BLACK TIN VESSEL {String(shipment.vessel).padStart(3, "0")}</text>
  </svg>;
}

export default function Dispatch() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [manifest, setManifest] = useState<ShippingManifest | null>(null);
  const [manifestName, setManifestName] = useState("");
  const [manifestDigest, setManifestDigest] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState("Waiting for a private SS dispatch manifest");

  const ingest = async (file?: File) => {
    if (!file) return;
    try {
      setStatus("Validating private fulfillment evidence");
      const source = await file.text();
      const admitted = parseShippingManifest(source);
      setManifest(admitted);
      setManifestName(file.name);
      setManifestDigest(await digest(source));
      setSelected(new Set(admitted.shipments.map((shipment) => shipment.shipment_id)));
      setStatus(`${admitted.shipments.length} package${admitted.shipments.length === 1 ? "" : "s"} admitted / ready to review`);
    } catch (error) {
      setManifest(null);
      setManifestName("");
      setManifestDigest("");
      setSelected(new Set());
      setStatus(error instanceof Error ? error.message : "Manifest could not be admitted");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const receiveDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    void ingest(event.dataTransfer.files?.[0]);
  };

  const toggle = (shipmentID: string) => setSelected((current) => {
    const next = new Set(current);
    if (next.has(shipmentID)) next.delete(shipmentID); else next.add(shipmentID);
    return next;
  });

  const print = () => {
    if (!selected.size) return;
    setStatus(`Opening local print dialog for ${selected.size} label${selected.size === 1 ? "" : "s"}`);
    requestAnimationFrame(() => window.print());
  };

  return <main className="dispatch-shell min-h-screen text-black">
    <PublicHeader active="dispatch" />
    <div className="dispatch-workspace mx-auto max-w-[1600px] px-5 py-10 md:px-8 md:py-16">
      <section className="dispatch-intro grid gap-10 border-b border-black/20 pb-12 lg:grid-cols-[1fr_0.75fr] lg:items-end">
        <div><p className="text-[9px] uppercase tracking-[0.25em] text-black/40">Sovereign Standard / private fulfillment / thermal output</p><h1 className="mt-5 max-w-3xl text-5xl font-light tracking-[-0.055em] md:text-7xl">Dispatch</h1><p className="mt-7 max-w-2xl text-sm leading-7 text-black/55">Admit one weekly fulfillment manifest, inspect the exact address carried by each vessel, and hand the selected labels to the local MUNBYN printer.</p></div>
        <div className="border border-black/20 p-5 font-mono text-[8px] uppercase leading-5 tracking-[0.14em] text-black/35">Local file memory only<br />3 × 2 inch vector labels<br />No address upload or browser storage<br />macOS print boundary</div>
      </section>

      {!manifest ? <button className="dispatch-empty mt-12 grid min-h-[430px] w-full place-items-center border border-dashed border-black/30 px-8 text-center hover:border-black" onClick={() => inputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={receiveDrop} type="button"><span><span className="block text-xl font-light">Admit weekly dispatch manifest</span><span className="mt-4 block font-mono text-[8px] uppercase tracking-[0.2em] text-black/35">Choose or drop SovereignStandard-Shipping-&lt;date&gt;-manifest.json</span></span></button> : <>
        <section className="dispatch-content mt-12 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="dispatch-print-area grid gap-6">
            {manifest.shipments.map((shipment, index) => <article className={`dispatch-record border border-black/20 bg-white p-4 ${selected.has(shipment.shipment_id) ? "" : "is-excluded"}`} key={shipment.shipment_id}>
              <div className="dispatch-record-header mb-4 flex items-center justify-between gap-4 font-mono text-[8px] uppercase tracking-[0.14em]"><label className="flex items-center gap-3"><input checked={selected.has(shipment.shipment_id)} onChange={() => toggle(shipment.shipment_id)} type="checkbox" /><span>{String(index + 1).padStart(2, "0")} / Vessel {String(shipment.vessel).padStart(3, "0")}</span></label><span className="text-black/30">{shipment.shipment_id}</span></div>
              <div className="dispatch-label-preview"><ShippingLabel origin={manifest.origin} shipment={shipment} /></div>
            </article>)}
          </div>
          <aside className="dispatch-controls flex flex-col border border-black/20 p-5 lg:sticky lg:top-24 lg:self-start">
            <p className="text-[9px] uppercase tracking-[0.22em] text-black/40">Dispatch state</p><p className="mt-4 text-3xl font-light">{selected.size} / {manifest.shipments.length}</p><p className="mt-2 font-mono text-[8px] uppercase tracking-[0.15em] text-black/30">labels selected</p>
            <dl className="mt-8 space-y-4 border-t border-black/20 pt-5 font-mono text-[8px] uppercase tracking-[0.13em]"><div className="flex justify-between gap-4"><dt className="text-black/35">Manifest</dt><dd className="max-w-40 truncate">{manifestName}</dd></div><div className="flex justify-between gap-4"><dt className="text-black/35">Week</dt><dd>{manifest.manifest_date}</dd></div><div className="flex justify-between gap-4"><dt className="text-black/35">Profile</dt><dd>3 × 2 in</dd></div><div className="flex justify-between gap-4"><dt className="text-black/35">Witness</dt><dd>{manifestDigest.slice(0, 12)}</dd></div></dl>
            <div className="mt-8 grid grid-cols-2 border border-black/25"><button className="border-r border-black/25 px-3 py-3 text-[8px] uppercase tracking-[0.14em]" onClick={() => setSelected(new Set(manifest.shipments.map((shipment) => shipment.shipment_id)))} type="button">Select all</button><button className="px-3 py-3 text-[8px] uppercase tracking-[0.14em]" onClick={() => setSelected(new Set())} type="button">Clear</button></div>
            <div className="mt-auto grid gap-2 pt-10"><button className="border border-black bg-black px-5 py-4 text-[8px] uppercase tracking-[0.18em] text-white disabled:opacity-25" disabled={!selected.size} onClick={print} type="button">Open MUNBYN print dialog</button><button className="px-5 py-3 text-[8px] uppercase tracking-[0.18em] text-black/40" onClick={() => inputRef.current?.click()} type="button">Replace manifest</button></div>
            <p className="mt-6 border-t border-black/15 pt-5 font-mono text-[7px] uppercase leading-4 tracking-[0.12em] text-black/30">In the system dialog choose MUNBYN, 3 × 2 inches, landscape, actual size / 100%, no margins.</p>
          </aside>
        </section>
      </>}
      <div aria-live="polite" className="dispatch-status mt-8 flex flex-wrap justify-between gap-4 border-t border-black/20 pt-4 font-mono text-[8px] uppercase tracking-[0.14em] text-black/35"><span>{status}</span><span>Private bytes are released on refresh</span></div>
      <input accept="application/json,.json" className="hidden" onChange={(event) => void ingest(event.target.files?.[0])} ref={inputRef} type="file" />
    </div>
  </main>;
}
