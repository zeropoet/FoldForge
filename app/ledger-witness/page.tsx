"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import PublicHeader from "../public-header";
import { actionableMintWorks, mergeMintRegistry, mintAvailability, validateMint } from "./ledger";
import "./ledger-witness.css";

declare global { interface Window { Xumm?: new (key: string) => XamanClient } }
type XamanClient = { authorize: () => Promise<unknown>; user: { account: Promise<string> }; payload: { createAndSubscribe: (body: unknown, callback: (event: { opened?: boolean; signed?: boolean }) => void) => Promise<{ created: XamanPayload; resolved?: Promise<{ signed?: boolean }> }>; get: (id: string) => Promise<XamanResult> } };
type XamanPayload = { uuid?: string; next?: { always?: string }; refs?: { qr_png?: string } };
type XamanResult = { uuid?: string; meta?: { signed?: boolean; cancelled?: boolean; expired?: boolean }; response?: { txid?: string } };
type BatchWork = { artifact_id: string; title: string; description: string; sha256: string; metadata_uri: string; sequence?: number; mint_status?: string; xrpl_transaction?: Record<string, unknown> };
type Unit = { id: number; state?: string; display_state?: string };

const LOCAL_PREPARED_MINTS = "/ledger-witness/foldportrait-mints.json";
const LOCAL_SS_VESSELS = "/ledger-witness/ss-vessels.json";
const LIVE_RELATIONS = "https://sovereign-standard-claim-relay.mancel.workers.dev/witness/foldportrait-relations";
const LIVE_UNITS = "https://sovereign-standard-claim-relay.mancel.workers.dev/registry/units";
const CONFIG = {
  xamanKey: "12b958fc-7cef-4b5d-933d-2c285bf09955",
  witnessWallet: "rfYiNfgLefTAZGfEyun1EjG68mTtC75vDe",
  archiveEndpoint: "https://sovereign-standard-claim-relay.mancel.workers.dev/witness/archive-result",
};

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
  const [propagation, setPropagation] = useState<"idle" | "queued" | "ss" | "foldportrait" | "complete">("idle");

  useEffect(() => { Promise.all([
    fetch(LOCAL_PREPARED_MINTS).then((response) => response.json()),
    fetch(LOCAL_SS_VESSELS).then((response) => response.json()),
    fetch(LIVE_RELATIONS, { cache: "no-store" }).then((response) => response.ok ? response.json() : null).catch(() => null),
    fetch(LIVE_UNITS, { cache: "no-store" }).then((response) => response.ok ? response.json() : null).catch(() => null),
  ]).then(([batchData, unitData, liveRelations, liveUnits]) => {
    const localBatch = Array.isArray(batchData.works) ? batchData.works as BatchWork[] : [];
    const loadedBatch = liveRelations ? mergeMintRegistry(localBatch, liveRelations) : localBatch;
    const effectiveUnitData = Array.isArray(liveUnits?.units) ? liveUnits : unitData;
    const loadedUnits = (Array.isArray(effectiveUnitData.units) ? effectiveUnitData.units : []).filter((unit: Unit & { claimed_at?: string }) => unit.state === "claimed" || unit.display_state === "CLAIMED").sort((left: Unit & { claimed_at?: string }, right: Unit & { claimed_at?: string }) => String(left.claimed_at || "").localeCompare(String(right.claimed_at || "")) || left.id - right.id);
    const ready = actionableMintWorks(loadedBatch, loadedUnits);
    setBatch(loadedBatch);
    setUnits(loadedUnits);
    if (ready.length === 1) {
      const work = ready[0];
      const assigned = work.sequence && loadedUnits[work.sequence - 1] ? [loadedUnits[work.sequence - 1].id] : [];
      setPreparedId(work.artifact_id); setVisibleUnits(assigned); setTitle(work.title); setDescription(work.description); setHash(work.sha256); setMetadataUri(work.metadata_uri);
      setStatus(`${work.title} → SS Vessel ${assigned[0]} / claim order ${work.sequence}`);
    } else {
      setStatus(`Completed FoldPortrait archive ready / ${loadedBatch.length} works / ${ready.length} currently eligible`);
    }
  }).catch(() => setStatus("Local prepared evidence is unavailable")); }, []);

  const errors = useMemo(() => validateMint({ account: CONFIG.witnessWallet, title, description, sha256: hash, metadataUri, visibleUnits }), [title, description, hash, metadataUri, visibleUnits]);
  const actionableWorks = useMemo(() => actionableMintWorks(batch, units), [batch, units]);
  const mintedCount = useMemo(() => batch.filter((work) => work.mint_status === "minted").length, [batch]);

  useEffect(() => {
    if (!preparedId || !transaction || propagation === "idle" || propagation === "complete") return;
    let active = true;
    const poll = async () => {
      try {
        const nonce = Date.now();
        const relations = await fetch(`${LIVE_RELATIONS}?status=${nonce}`, { cache: "no-store" }).then((response) => response.json());
        if (!active) return;
        const minted = (value: { works?: BatchWork[] }) => value.works?.find((work) => work.artifact_id === preparedId)?.mint_status === "minted";
        if (minted(relations)) {
          setBatch((current) => mergeMintRegistry(current, relations));
          setPropagation("complete"); setStatus("Canonical SS relation committed / FoldForge Ledger synchronized");
          sessionStorage.removeItem("foldforge_ledger_witness_payload"); localStorage.removeItem("foldforge_ledger_witness_intent");
        }
      } catch { /* retain the last verified stage and retry */ }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 10_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [preparedId, propagation, transaction]);

  const choosePrepared = (id: string) => {
    setPreparedId(id);
    const work = batch.find((entry) => entry.artifact_id === id);
    if (!work) return;
    const assigned = work.sequence && units[work.sequence - 1] ? [units[work.sequence - 1].id] : [];
    setVisibleUnits(assigned); setTitle(work.title); setDescription(work.description); setHash(work.sha256); setMetadataUri(work.metadata_uri); setIntent(null); setPayload(null); setTransaction(""); setStatus(assigned.length ? `${work.title} → SS Vessel ${assigned[0]} / claim order ${work.sequence}` : `${work.title} awaits a claimed SS vessel in sequence`);
  };

  const connect = async () => {
    try { setStatus("Connecting Xaman…"); await loadXaman(); if (!window.Xumm) throw new Error("Xaman SDK unavailable"); client.current ||= new window.Xumm(CONFIG.xamanKey); await client.current.authorize(); const connected = await client.current.user.account; setAccount(connected || ""); setStatus(connected === CONFIG.witnessWallet ? "Witness wallet connected" : "Connected wallet does not match witness authority"); } catch (error) { setStatus(error instanceof Error ? error.message : "Xaman connection failed"); }
  };

  const prepare = () => {
    const prepared = batch.find((work) => work.artifact_id === preparedId);
    if (!prepared) { setStatus("Select a FoldPortrait-catalog work first"); return; }
    if (errors.length) { setStatus(errors[0]); return; }
    const id = prepared.artifact_id;
    const value = { schema: "foldforge_ledger_witness_intent_v1", created_at: new Date().toISOString(), lineage: { system: "FoldPortrait", issuance_channel: "FoldForge Ledger Witness", exclusive: true }, source: { local_snapshot: LOCAL_PREPARED_MINTS, authority: "foldportrait/Mint/catalog.json", admission: "catalog_only" }, work: { id, title, description, sha256: hash, metadata_uri: metadataUri, visible_on_units: visibleUnits }, witness_wallet: CONFIG.witnessWallet, signing_boundary: "human_steward_through_xaman", xrpl_transaction: prepared.xrpl_transaction };
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
    const result = await response.json().catch(() => ({}));
    if (response.ok) { setPropagation("queued"); setStatus("Verified result queued / tracking propagation automatically"); }
    else setStatus(result.error || "Archive submission failed");
  };

  return <main className="ledger-witness-shell min-h-screen text-black">
    <PublicHeader active="ledger" />
    <div className="ledger-witness-workspace mx-auto max-w-[1600px] px-5 py-10 md:px-8 md:py-16">
      <section className="ledger-witness-intro grid gap-10 border-b border-black/20 pb-12 lg:grid-cols-[1fr_0.75fr] lg:items-end"><div><p className="text-[9px] uppercase tracking-[0.25em] text-black/40">Sovereign Standard / FoldPortrait issuance / XRPL witness</p><h1 className="mt-5 max-w-3xl text-5xl font-light tracking-[-0.055em] md:text-7xl">Ledger Witness</h1><p className="mt-7 max-w-2xl text-sm leading-7 text-black/55">Prepare one sealed FoldPortrait work, hand its exact mint transaction to the configured Xaman wallet, and return the verified ledger result to its canonical record and Sovereign Standard vessel relation.</p></div><div className="border border-black/20 p-5 font-mono text-[8px] uppercase leading-5 tracking-[0.14em] text-black/35">FoldPortrait works only<br />Committed source evidence<br />XRPL mainnet / NFTokenMint<br />Human Xaman signature required</div></section>
      <section className="ledger-witness-content mt-12 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="ledger-witness-workflow grid gap-6"><article className="ledger-witness-record border border-black/20 bg-white p-6 md:p-8"><p className="text-[9px] uppercase tracking-[0.22em] text-black/40">01 / Select admitted FoldPortrait work</p><label className="mt-5 block border border-black/25 p-4 text-[8px] uppercase tracking-[0.16em] text-black/45">Ready to mint / {actionableWorks.length.toString().padStart(2, "0")}<select className="mt-3 w-full bg-white text-sm normal-case text-black" value={preparedId} onChange={(event) => choosePrepared(event.target.value)}><option value="">{actionableWorks.length ? "Select prepared work" : "No prepared works have an available vessel"}</option>{actionableWorks.map((work) => <option key={work.artifact_id} value={work.artifact_id}>{work.sequence ? `${work.sequence}. ` : ""}{work.title} → Vessel {work.sequence ? units[work.sequence - 1]?.id : ""}</option>)}</select></label><p className="mt-3 font-mono text-[8px] uppercase leading-5 tracking-[0.13em] text-black/30">Shows only unminted catalog works whose claim-order Sovereign Standard vessel is already available.</p></article>
          <article className="ledger-witness-record border border-black/20 bg-white p-6 md:p-8"><p className="text-[9px] uppercase tracking-[0.22em] text-black/40">02 / Verify and attach</p><div className="mt-5 grid gap-4"><input readOnly className="border-b border-black/25 bg-white py-3 text-xl outline-none" placeholder="Catalog work title" value={title} /><textarea readOnly className="min-h-24 border border-black/20 bg-white p-4 text-sm leading-6 outline-none" placeholder="Catalog description" value={description} /><input readOnly className="border-b border-black/25 bg-white py-3 font-mono text-[10px] outline-none" placeholder="Canonical FoldPortrait metadata URI" value={metadataUri} /><div className="border border-black/20 p-4"><p className="text-[8px] uppercase tracking-[0.16em] text-black/40">SS vessel relation / claim order</p><p className="mt-3 text-sm">{visibleUnits.length ? `Vessel ${visibleUnits[0]} / fixed automatically` : "Awaiting the corresponding claimed vessel"}</p></div></div></article>
          <article className="ledger-witness-record border border-black/20 bg-white p-6 md:p-8"><p className="text-[9px] uppercase tracking-[0.22em] text-black/40">03 / Prepare and sign</p><div className="mt-5 flex flex-wrap gap-2"><button className="border border-black bg-black px-5 py-4 text-[8px] uppercase tracking-[0.18em] text-white" onClick={prepare}>Prepare mint intent</button><button className="border border-black/35 px-5 py-4 text-[8px] uppercase tracking-[0.18em]" onClick={() => void connect()}>{account ? "Wallet connected" : "Connect Xaman"}</button><button disabled={!intent} className="border border-black bg-white px-5 py-4 text-[8px] uppercase tracking-[0.18em] text-black disabled:opacity-25" onClick={() => void sign()}>Open signing request</button></div></article></div>
        <aside className="ledger-witness-controls flex flex-col border border-black/20 bg-white p-5 lg:sticky lg:top-24 lg:self-start"><p className="text-[9px] uppercase tracking-[0.22em] text-black/40">Witness state</p><p className="mt-4 text-3xl font-light">{preparedId ? "01 / 01" : "00 / 01"}</p><p className="mt-2 font-mono text-[8px] uppercase tracking-[0.15em] text-black/30">work admitted</p><p className="mt-7 border-t border-black/20 pt-5 text-sm font-light leading-6">{status}</p><dl className="mt-6 space-y-4 border-t border-black/20 pt-5 font-mono text-[8px] uppercase tracking-[0.13em]"><div className="flex justify-between gap-4"><dt className="text-black/35">Source hash</dt><dd>{hash ? hash.slice(0, 12) : "Waiting"}</dd></div><div className="flex justify-between gap-4"><dt className="text-black/35">Intent</dt><dd>{intent ? "Prepared" : "Waiting"}</dd></div><div className="flex justify-between gap-4"><dt className="text-black/35">Wallet</dt><dd>{account ? `${account.slice(0, 8)}…` : "Disconnected"}</dd></div><div className="flex justify-between gap-4"><dt className="text-black/35">Payload</dt><dd>{payload?.uuid ? payload.uuid.slice(0, 8) : "Waiting"}</dd></div><div className="flex justify-between gap-4"><dt className="text-black/35">Transaction</dt><dd>{transaction ? `${transaction.slice(0, 10)}…` : "Waiting"}</dd></div><div className="flex justify-between gap-4"><dt className="text-black/35">Propagation</dt><dd>{propagation}</dd></div></dl>{payload?.next?.always ? <a className="mt-8 border border-black/30 p-4 text-center text-[8px] uppercase tracking-[0.18em]" href={payload.next.always} rel="noreferrer" target="_blank">Open in Xaman</a> : null}<div className="mt-auto grid gap-2 pt-10"><button disabled={!payload?.uuid} className="border border-black/25 p-4 text-[8px] uppercase tracking-[0.18em] disabled:opacity-25" onClick={() => void checkResult()}>Check result</button><button disabled={!transaction || propagation !== "idle"} className="border border-black bg-black p-4 text-[8px] uppercase tracking-[0.18em] text-white disabled:opacity-25" onClick={() => void archive()}>{propagation === "idle" ? "Archive verified result" : "Propagation in progress"}</button></div><p className="mt-6 border-t border-black/15 pt-5 font-mono text-[7px] uppercase leading-4 tracking-[0.12em] text-black/30">The transaction remains unsigned until the configured human steward confirms it through Xaman.</p></aside>
      </section>
      <details className="mt-8 border border-black/20 bg-white p-5">
        <summary className="cursor-pointer text-[8px] uppercase tracking-[0.18em] text-black/40">Completed FoldPortrait archive / {batch.length.toString().padStart(3, "0")} works / {mintedCount.toString().padStart(3, "0")} minted / {actionableWorks.length.toString().padStart(2, "0")} ready</summary>
        <ol className="mt-6 grid gap-px border border-black/15 bg-black/15 sm:grid-cols-2 lg:grid-cols-3">
          {batch.map((work) => <li className="flex items-center justify-between gap-4 bg-white p-3 font-mono text-[7px] uppercase leading-4 tracking-[0.11em]" key={work.artifact_id}><span>{String(work.sequence || 0).padStart(3, "0")} / {work.title}</span><span className={mintAvailability(work, units) === "ready" ? "text-red-600" : "text-black/30"}>{mintAvailability(work, units)}</span></li>)}
        </ol>
      </details>
      {intent ? <details className="mt-8 border border-black/20 bg-white p-5"><summary className="cursor-pointer text-[8px] uppercase tracking-[0.18em] text-black/40">Prepared transaction evidence</summary><pre className="mt-5 overflow-x-auto text-[8px] leading-5 text-black/45">{JSON.stringify(intent, null, 2)}</pre></details> : null}
      <div aria-live="polite" className="ledger-witness-status mt-8 flex flex-wrap justify-between gap-4 border-t border-black/20 pt-4 font-mono text-[8px] uppercase tracking-[0.14em] text-black/35"><span>{status}</span><span>Canonical evidence / human signature boundary</span></div>
    </div>
  </main>;
}
