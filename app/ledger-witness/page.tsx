"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { buildMintTransaction, slugify, validateMint } from "./ledger";

declare global { interface Window { Xumm?: new (key: string) => XamanClient } }
type XamanClient = { authorize: () => Promise<unknown>; user: { account: Promise<string> }; payload: { createAndSubscribe: (body: unknown, callback: (event: { opened?: boolean; signed?: boolean }) => void) => Promise<{ created: XamanPayload; resolved?: Promise<{ signed?: boolean }> }>; get: (id: string) => Promise<XamanResult> } };
type XamanPayload = { uuid?: string; next?: { always?: string }; refs?: { qr_png?: string } };
type XamanResult = { uuid?: string; meta?: { signed?: boolean; cancelled?: boolean; expired?: boolean }; response?: { txid?: string } };
type BatchWork = { artifact_id: string; title: string; description: string; sha256: string; metadata_uri: string; sequence?: number; xrpl_transaction?: Record<string, unknown> };
type Unit = { id: number; state?: string; display_state?: string };

const LOCAL_PREPARED_MINTS = "/ledger-witness/foldportrait-mints.json";
const LOCAL_SS_VESSELS = "/ledger-witness/ss-vessels.json";
const CONFIG = {
  xamanKey: "12b958fc-7cef-4b5d-933d-2c285bf09955",
  witnessWallet: "rfYiNfgLefTAZGfEyun1EjG68mTtC75vDe",
  archiveEndpoint: "https://sovereign-standard-claim-relay.mancel.workers.dev/witness/archive-result",
};

async function sha256(file: File) { const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer()); return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join(""); }
function loadXaman() { return new Promise<void>((resolve, reject) => { if (window.Xumm) return resolve(); const script = document.createElement("script"); script.src = "https://xumm.app/assets/cdn/xumm.min.js"; script.crossOrigin = "anonymous"; script.onload = () => resolve(); script.onerror = () => reject(new Error("Xaman SDK unavailable")); document.head.appendChild(script); }); }

export default function LedgerWitness() {
  const client = useRef<XamanClient | null>(null);
  const [batch, setBatch] = useState<BatchWork[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [preparedId, setPreparedId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [hash, setHash] = useState("");
  const [metadataUri, setMetadataUri] = useState("");
  const [visibleUnits, setVisibleUnits] = useState<number[]>([]);
  const [account, setAccount] = useState("");
  const [status, setStatus] = useState("Loading SS mint evidence…");
  const [intent, setIntent] = useState<Record<string, unknown> | null>(null);
  const [payload, setPayload] = useState<XamanPayload | null>(null);
  const [transaction, setTransaction] = useState("");

  useEffect(() => { Promise.all([
    fetch(LOCAL_PREPARED_MINTS).then((response) => response.json()),
    fetch(LOCAL_SS_VESSELS).then((response) => response.json()),
  ]).then(([batchData, unitData]) => {
    setBatch(Array.isArray(batchData.works) ? batchData.works : []);
    setUnits((Array.isArray(unitData.units) ? unitData.units : []).filter((unit: Unit & { claimed_at?: string }) => unit.state === "claimed" || unit.display_state === "CLAIMED").sort((left: Unit & { claimed_at?: string }, right: Unit & { claimed_at?: string }) => String(left.claimed_at || "").localeCompare(String(right.claimed_at || "")) || left.id - right.id));
    setStatus("Local mint evidence ready");
    const saved = localStorage.getItem("foldforge_ledger_witness_draft");
    if (saved) { const draft = JSON.parse(saved); setTitle(draft.title || ""); setDescription(draft.description || ""); setHash(draft.hash || ""); setMetadataUri(draft.metadataUri || ""); setVisibleUnits(draft.visibleUnits || []); }
  }).catch(() => setStatus("Local prepared evidence is unavailable")); }, []);

  useEffect(() => { localStorage.setItem("foldforge_ledger_witness_draft", JSON.stringify({ title, description, hash, metadataUri, visibleUnits })); }, [title, description, hash, metadataUri, visibleUnits]);

  const errors = useMemo(() => validateMint({ account: CONFIG.witnessWallet, title, description, sha256: hash, metadataUri, visibleUnits }), [title, description, hash, metadataUri, visibleUnits]);

  const choosePrepared = (id: string) => {
    setPreparedId(id);
    const work = batch.find((entry) => entry.artifact_id === id);
    if (!work) return;
    const assigned = work.sequence && units[work.sequence - 1] ? [units[work.sequence - 1].id] : [];
    setVisibleUnits(assigned); setTitle(work.title); setDescription(work.description); setHash(work.sha256); setMetadataUri(work.metadata_uri); setIntent(null); setPayload(null); setTransaction(""); setStatus(assigned.length ? `${work.title} → SS Vessel ${assigned[0]} / claim order ${work.sequence}` : `${work.title} awaits a claimed SS vessel in sequence`);
  };

  const chooseFile = async (file?: File) => {
    if (!file) return;
    setPreparedId(""); setVisibleUnits([]); setTitle(file.name.replace(/\.[^.]+$/, "")); setHash(await sha256(file)); setMetadataUri(""); setIntent(null); setStatus("FoldPortrait source identified locally / claim-order attachment remains pending");
  };

  const connect = async () => {
    try { setStatus("Connecting Xaman…"); await loadXaman(); if (!window.Xumm) throw new Error("Xaman SDK unavailable"); client.current ||= new window.Xumm(CONFIG.xamanKey); await client.current.authorize(); const connected = await client.current.user.account; setAccount(connected || ""); setStatus(connected === CONFIG.witnessWallet ? "Witness wallet connected" : "Connected wallet does not match witness authority"); } catch (error) { setStatus(error instanceof Error ? error.message : "Xaman connection failed"); }
  };

  const prepare = () => {
    if (errors.length) { setStatus(errors[0]); return; }
    const id = preparedId || slugify(title);
    const prepared = batch.find((work) => work.artifact_id === preparedId);
    const tx = prepared?.xrpl_transaction || buildMintTransaction({ account: CONFIG.witnessWallet, id, title, sha256: hash, metadataUri });
    const value = { schema: "foldforge_ledger_witness_intent_v1", created_at: new Date().toISOString(), lineage: { system: "FoldPortrait", issuance_channel: "FoldForge Ledger Witness", exclusive: true }, source: prepared ? { local_snapshot: LOCAL_PREPARED_MINTS, authority: "foldportrait/Mint/catalog.json" } : { local_foldportrait_file_ingest: true }, work: { id, title, description, sha256: hash, metadata_uri: metadataUri, visible_on_units: visibleUnits }, witness_wallet: CONFIG.witnessWallet, signing_boundary: "human_steward_through_xaman", xrpl_transaction: tx };
    setIntent(value); localStorage.setItem("foldforge_ledger_witness_intent", JSON.stringify(value)); setStatus("Mint intent prepared locally / Xaman signature remains required");
  };

  const sign = async () => {
    if (!intent) return;
    if (account !== CONFIG.witnessWallet) { await connect(); return; }
    try { setStatus("Creating Xaman signing request…"); const subscription = await client.current!.payload.createAndSubscribe({ txjson: intent.xrpl_transaction, options: { force_network: "MAINNET" }, custom_meta: { identifier: (intent.work as { id: string }).id, instruction: `Witness ${title}` } }, (event) => { if (event.opened) setStatus("Signing request opened in Xaman"); }); const created = subscription.created; setPayload(created); sessionStorage.setItem("foldforge_ledger_witness_payload", created.uuid || ""); setStatus("Awaiting human signature in Xaman"); if (subscription.resolved) { await subscription.resolved; await checkResult(created.uuid); } } catch (error) { setStatus(error instanceof Error ? error.message : "Xaman request failed"); }
  };

  const checkResult = async (id = payload?.uuid) => {
    if (!id || !client.current) return;
    const result = await client.current.payload.get(id);
    const txid = result.response?.txid || "";
    setTransaction(txid);
    setStatus(txid ? "XRPL transaction verified by Xaman / ready to archive" : result.meta?.signed ? "Signed / awaiting transaction hash" : "Signature still pending");
  };

  const archive = async () => {
    if (!intent || !payload?.uuid || !transaction) return;
    setStatus("Submitting verified result to SS archive boundary…");
    const work = intent.work as { id: string; sha256: string; visible_on_units: number[] };
    const response = await fetch(CONFIG.archiveEndpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ artifact_id: work.id, title, file_sha256: work.sha256, visible_on_units: work.visible_on_units, payload_uuid: payload.uuid, transaction_hash: transaction, witness_wallet: CONFIG.witnessWallet, network: "MAINNET", archived_at: new Date().toISOString() }) });
    const result = await response.json().catch(() => ({})); setStatus(response.ok ? "Verified result queued for SS archive commit" : result.error || "Archive submission failed");
  };

  return <main className="min-h-screen bg-black text-white">
    <header className="site-header sticky top-0 z-20 border-b border-white/20 px-5 py-3 md:px-8"><div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 sm:flex-nowrap sm:gap-5"><Link href="/"><span className="block text-[10px] uppercase tracking-[0.26em]">FoldForge</span><span className="mt-1 block font-mono text-[7px] uppercase tracking-[0.18em] text-white/35">XRPL minting &amp; provenance instrument</span></Link><nav className="flex w-full justify-between border-t border-white/10 pt-3 text-[9px] uppercase tracking-[0.2em] sm:w-auto sm:gap-5 sm:border-0 sm:pt-0"><Link className="text-white/40" href="/">Archive</Link><Link className="text-white/40" href="/sonic-forge">Sonic</Link><Link className="text-white/40" href="/temporal-forge">Temporal</Link><span>Ledger</span></nav></div></header>
    <div className="mx-auto max-w-[1600px] px-5 py-10 md:px-8 md:py-16">
      <section className="grid gap-10 border-b border-white/20 pb-12 lg:grid-cols-[1fr_0.75fr] lg:items-end"><div><p className="text-[9px] uppercase tracking-[0.25em] text-white/40">FoldPortrait issuance / evidence / signature / relation</p><h1 className="mt-5 text-5xl font-light tracking-[-0.055em] md:text-7xl">Ledger Witness</h1><p className="mt-7 max-w-2xl text-sm leading-7 text-white/55">FoldPortrait’s exclusive XRPL issuance channel. Prepare one sealed work, hand its exact mint transaction to the configured Xaman wallet, and return the verified ledger result to its FoldPortrait record and Sovereign Standard vessel relation.</p></div><div className="border border-white/20 p-5 font-mono text-[8px] uppercase leading-5 tracking-[0.14em] text-white/35">FoldPortrait works only<br />Local source snapshots and drafts<br />XRPL mainnet / NFTokenMint<br />Human Xaman signature required</div></section>
      <section className="mt-12 grid gap-px bg-white/20 lg:grid-cols-[1fr_330px]">
        <div className="space-y-10 bg-black p-6 md:p-8"><div><p className="text-[9px] uppercase tracking-[0.22em] text-white/40">01 / Admit FoldPortrait evidence</p><div className="mt-5 grid gap-3 md:grid-cols-2"><label className="border border-white/25 p-4 text-[8px] uppercase tracking-[0.16em] text-white/45">Prepared FoldPortrait<select className="mt-3 w-full bg-black text-sm normal-case text-white" value={preparedId} onChange={(event) => choosePrepared(event.target.value)}><option value="">Select sealed work</option>{batch.map((work) => <option key={work.artifact_id} value={work.artifact_id}>{work.sequence ? `${work.sequence}. ` : ""}{work.title}</option>)}</select></label><label className="grid cursor-pointer place-items-center border border-dashed border-white/25 p-4 text-center text-[8px] uppercase tracking-[0.16em] text-white/45">Admit a future FoldPortrait file<input className="hidden" type="file" onChange={(event) => void chooseFile(event.target.files?.[0])} /></label></div></div>
          <div><p className="text-[9px] uppercase tracking-[0.22em] text-white/40">02 / Describe and attach</p><div className="mt-5 grid gap-4"><input className="border-b border-white/25 bg-black py-3 text-xl outline-none" placeholder="Work title" value={title} onChange={(event) => setTitle(event.target.value)} /><textarea className="min-h-24 border border-white/20 bg-black p-4 text-sm leading-6 outline-none" placeholder="Description" value={description} onChange={(event) => setDescription(event.target.value)} /><input className="border-b border-white/25 bg-black py-3 font-mono text-[10px] outline-none" placeholder="Public metadata URI / ipfs://… or https://…" value={metadataUri} onChange={(event) => setMetadataUri(event.target.value)} /><div className="border border-white/20 p-4"><p className="text-[8px] uppercase tracking-[0.16em] text-white/40">SS archive attachment / claim order</p><p className="mt-3 text-sm">{visibleUnits.length ? `Vessel ${visibleUnits[0]} / fixed automatically` : "Awaiting the corresponding claimed vessel"}</p></div></div></div>
          <div><p className="text-[9px] uppercase tracking-[0.22em] text-white/40">03 / Prepare and sign</p><div className="mt-5 flex flex-wrap gap-2"><button className="border border-white px-5 py-4 text-[8px] uppercase tracking-[0.18em]" onClick={prepare}>Prepare mint intent</button><button className="border border-white/35 px-5 py-4 text-[8px] uppercase tracking-[0.18em]" onClick={() => void connect()}>{account ? "Wallet connected" : "Connect Xaman"}</button><button disabled={!intent} className="bg-white px-5 py-4 text-[8px] uppercase tracking-[0.18em] text-black disabled:opacity-25" onClick={() => void sign()}>Open signing request</button></div></div></div>
        <aside className="flex flex-col bg-black p-6"><p className="text-[9px] uppercase tracking-[0.22em] text-white/40">Witness state</p><p className="mt-5 text-xl font-light leading-8">{status}</p><dl className="mt-8 space-y-4 border-t border-white/20 pt-5 font-mono text-[8px] uppercase tracking-[0.13em]"><div className="flex justify-between gap-4"><dt className="text-white/35">Source hash</dt><dd>{hash ? hash.slice(0, 12) : "Waiting"}</dd></div><div className="flex justify-between gap-4"><dt className="text-white/35">Intent</dt><dd>{intent ? "Prepared" : "Waiting"}</dd></div><div className="flex justify-between gap-4"><dt className="text-white/35">Wallet</dt><dd>{account ? `${account.slice(0, 8)}…` : "Disconnected"}</dd></div><div className="flex justify-between gap-4"><dt className="text-white/35">Payload</dt><dd>{payload?.uuid ? payload.uuid.slice(0, 8) : "Waiting"}</dd></div><div className="flex justify-between gap-4"><dt className="text-white/35">Transaction</dt><dd>{transaction ? `${transaction.slice(0, 10)}…` : "Waiting"}</dd></div></dl>{payload?.next?.always ? <a className="mt-8 border border-white/30 p-4 text-center text-[8px] uppercase tracking-[0.18em]" href={payload.next.always} rel="noreferrer" target="_blank">Open in Xaman</a> : null}<div className="mt-auto grid gap-2 pt-10"><button disabled={!payload?.uuid} className="border border-white/25 p-4 text-[8px] uppercase tracking-[0.18em] disabled:opacity-25" onClick={() => void checkResult()}>Check result</button><button disabled={!transaction} className="border border-white p-4 text-[8px] uppercase tracking-[0.18em] disabled:opacity-25" onClick={() => void archive()}>Archive verified result</button></div></aside>
      </section>
      {intent ? <details className="mt-8 border border-white/20 p-5"><summary className="cursor-pointer text-[8px] uppercase tracking-[0.18em] text-white/40">Prepared transaction evidence</summary><pre className="mt-5 overflow-x-auto text-[8px] leading-5 text-white/45">{JSON.stringify(intent, null, 2)}</pre></details> : null}
    </div>
  </main>;
}
