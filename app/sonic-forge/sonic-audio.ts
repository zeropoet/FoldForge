import displacementMap from "../../public/root-logos-living-object-displacement.json";

export interface RenderControls {
  clarity: number;
  displacement: number;
  synthesis: number;
  phaseStretch: number;
}

export interface MasterMetrics {
  duration: number;
  sampleRate: number;
  channels: number;
  bitDepth: number;
  peakDbfs: number;
  rmsDbfs: number;
  estimatedLufs: number;
  bytes: number;
  sha256: string;
}

export interface SonicMaster {
  blob: Blob;
  metrics: MasterMetrics;
  waveform: number[];
}

export interface LibraryTrack {
  id: string;
  title: string;
  sequence: number;
  fileName: string;
  createdAt: string;
  audio: Blob;
  witness: Record<string, unknown>;
  metrics: MasterMetrics;
}

const outputRate = 48_000;
const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));

function shapingCurve(): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(8_192);
  for (let index = 0; index < curve.length; index += 1) {
    const x = index * 2 / (curve.length - 1) - 1;
    curve[index] = Math.tanh(x * 2.1);
  }
  return curve;
}

function scheduleProgression(
  panner: StereoPannerNode,
  delay: DelayNode,
  wet: GainNode,
  duration: number,
  controls: RenderControls,
) {
  const amount = controls.displacement / 100;
  const curve = 0.45 + controls.phaseStretch / 100 * 1.1;
  displacementMap.samples.forEach((sample, index) => {
    const position = index / Math.max(1, displacementMap.samples.length - 1);
    const warped = position ** curve;
    const time = warped * duration;
    panner.pan.setValueAtTime(0, time);
    delay.delayTime.linearRampToValueAtTime(0.008 + Math.abs(sample.depthDisplacement) * amount * 0.42, time);
    wet.gain.linearRampToValueAtTime(clamp((0.24 + sample.energyDisplacement * 0.13) * amount, 0.03, 0.5), time);
  });
}

export async function renderMaster(buffer: AudioBuffer, controls: RenderControls): Promise<SonicMaster> {
  const frames = Math.ceil(buffer.duration * outputRate);
  const context = new OfflineAudioContext(2, frames, outputRate);
  const source = context.createBufferSource();
  source.buffer = buffer;
  const highpass = context.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = 20 + controls.clarity / 100 * 55;
  const foundation = context.createBiquadFilter();
  foundation.type = "lowshelf";
  foundation.frequency.value = 92;
  foundation.gain.value = 2.2;
  const presence = context.createBiquadFilter();
  presence.type = "peaking";
  presence.frequency.value = 2_400 + controls.clarity / 100 * 1_300;
  presence.Q.value = 0.72;
  presence.gain.value = controls.clarity / 100 * 4.5;
  const transient = context.createBiquadFilter();
  transient.type = "highshelf";
  transient.frequency.value = 4_800;
  transient.gain.value = 1.8;
  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -10 - controls.clarity / 100 * 22;
  compressor.ratio.value = 1 + controls.clarity / 100 * 4.5;
  compressor.attack.value = 0.012;
  compressor.release.value = 0.22;
  compressor.knee.value = 16;
  const panner = context.createStereoPanner();
  const delay = context.createDelay(0.14);
  const feedback = context.createGain();
  feedback.gain.value = controls.displacement / 100 * 0.26;
  const wet = context.createGain();
  const shaper = context.createWaveShaper();
  shaper.curve = shapingCurve();
  shaper.oversample = "4x";
  const synth = context.createGain();
  synth.gain.value = controls.synthesis / 100 * 0.38;
  const resonance = context.createGain();
  resonance.gain.value = controls.synthesis / 100 * 0.52 + controls.displacement / 100 * 0.12;
  const formants = [
    390 + controls.displacement / 100 * 90,
    1_080 + controls.clarity / 100 * 240,
    2_760 + controls.synthesis / 100 * 420,
  ];
  const resonators = formants.map((frequency, index) => {
    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = frequency;
    filter.Q.value = 7 + controls.synthesis / 100 * 13 + index * 2;
    return filter;
  });
  const body = context.createBiquadFilter();
  body.type = "bandpass";
  body.frequency.value = 168;
  body.Q.value = 1.15;
  const bodyGain = context.createGain();
  bodyGain.gain.value = 0.16;
  const output = context.createGain();
  output.gain.value = 0.88;
  const limiter = context.createDynamicsCompressor();
  limiter.threshold.value = -2;
  limiter.knee.value = 1;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.002;
  limiter.release.value = 0.12;

  source.connect(highpass).connect(foundation).connect(presence).connect(transient).connect(compressor).connect(panner).connect(limiter).connect(output);
  compressor.connect(delay).connect(wet).connect(panner);
  delay.connect(feedback).connect(delay);
  compressor.connect(shaper).connect(synth).connect(panner);
  resonators.forEach((filter) => compressor.connect(filter).connect(resonance));
  resonance.connect(delay);
  resonance.connect(panner);
  compressor.connect(body).connect(bodyGain).connect(delay);
  bodyGain.connect(panner);
  output.connect(context.destination);
  scheduleProgression(panner, delay, wet, buffer.duration, controls);
  source.start();
  const rendered = await context.startRendering();
  return encodeMaster(rendered);
}

async function encodeMaster(buffer: AudioBuffer): Promise<SonicMaster> {
  const channels = [buffer.getChannelData(0), buffer.getChannelData(1)];
  let sum = 0;
  let peak = 0;
  for (let frame = 0; frame < buffer.length; frame += 1) {
    for (const channel of channels) {
      const sample = channel[frame];
      sum += sample * sample;
      peak = Math.max(peak, Math.abs(sample));
    }
  }
  const rms = Math.sqrt(sum / Math.max(1, buffer.length * channels.length));
  const targetRms = 10 ** (-18 / 20);
  const ceiling = 10 ** (-1 / 20);
  const gain = Math.min(rms > 0 ? targetRms / rms : 1, ceiling / Math.max(peak, 1e-9));
  const dataBytes = buffer.length * 2 * 3;
  const wav = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(wav);
  const write = (offset: number, value: string) => [...value].forEach((letter, index) => view.setUint8(offset + index, letter.charCodeAt(0)));
  write(0, "RIFF"); view.setUint32(4, 36 + dataBytes, true); write(8, "WAVE"); write(12, "fmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 2, true);
  view.setUint32(24, outputRate, true); view.setUint32(28, outputRate * 6, true); view.setUint16(32, 6, true); view.setUint16(34, 24, true);
  write(36, "data"); view.setUint32(40, dataBytes, true);
  const waveform = Array.from({ length: 360 }, () => 0);
  let outputPeak = 0;
  let outputSum = 0;
  let offset = 44;
  for (let frame = 0; frame < buffer.length; frame += 1) {
    for (const channel of channels) {
      const sample = clamp(channel[frame] * gain, -ceiling, ceiling);
      outputPeak = Math.max(outputPeak, Math.abs(sample));
      outputSum += sample * sample;
      let integer = Math.round(sample * 8_388_607);
      if (integer < 0) integer += 16_777_216;
      view.setUint8(offset, integer & 0xff);
      view.setUint8(offset + 1, (integer >>> 8) & 0xff);
      view.setUint8(offset + 2, (integer >>> 16) & 0xff);
      offset += 3;
      const bucket = Math.min(359, Math.floor(frame / buffer.length * 360));
      waveform[bucket] = Math.max(waveform[bucket], Math.abs(sample));
    }
  }
  const outputRms = Math.sqrt(outputSum / Math.max(1, buffer.length * 2));
  const blob = new Blob([wav], { type: "audio/wav" });
  const hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", wav))].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  const rmsDbfs = 20 * Math.log10(Math.max(outputRms, 1e-9));
  return {
    blob,
    waveform,
    metrics: {
      duration: buffer.duration,
      sampleRate: outputRate,
      channels: 2,
      bitDepth: 24,
      peakDbfs: Number((20 * Math.log10(Math.max(outputPeak, 1e-9))).toFixed(2)),
      rmsDbfs: Number(rmsDbfs.toFixed(2)),
      estimatedLufs: Number((rmsDbfs + 2).toFixed(2)),
      bytes: blob.size,
      sha256: hash,
    },
  };
}

function openLibrary(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("foldforge-sonic-library", 2);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains("tracks")) request.result.createObjectStore("tracks", { keyPath: "id" });
      if (!request.result.objectStoreNames.contains("meta")) request.result.createObjectStore("meta");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function listLibraryTracks(): Promise<LibraryTrack[]> {
  const database = await openLibrary();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction("tracks");
    const request = transaction.objectStore("tracks").getAll();
    request.onsuccess = () => resolve((request.result as LibraryTrack[]).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
  });
}

export async function admitLibraryTrack(track: Omit<LibraryTrack, "sequence" | "fileName">): Promise<LibraryTrack> {
  const database = await openLibrary();
  const admitted = await new Promise<LibraryTrack>((resolve, reject) => {
    const transaction = database.transaction(["tracks", "meta"], "readwrite");
    const tracks = transaction.objectStore("tracks");
    const meta = transaction.objectStore("meta");
    let result: LibraryTrack | undefined;
    const storeWithSequence = (sequence: number) => {
      const safeTitle = track.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "untitled";
      result = {
        ...track,
        sequence,
        fileName: `Sonic-Forge-${String(sequence).padStart(4, "0")}-${safeTitle}-master.wav`,
      };
      tracks.put(result);
      meta.put(sequence + 1, "next-sequence");
    };
    const allocateSequence = () => {
      const counterRequest = meta.get("next-sequence");
      counterRequest.onsuccess = () => {
        if (typeof counterRequest.result === "number") {
          storeWithSequence(counterRequest.result);
          return;
        }
        const allRequest = tracks.getAll();
        allRequest.onsuccess = () => {
          const existingTracks = allRequest.result as Array<Partial<LibraryTrack>>;
          const maximum = existingTracks.reduce((value, item) => Math.max(value, item.sequence ?? 0), existingTracks.length);
          storeWithSequence(maximum + 1);
        };
      };
    };
    const existingRequest = tracks.get(track.id);
    existingRequest.onsuccess = () => {
      if (existingRequest.result?.sequence && existingRequest.result?.fileName) {
        result = existingRequest.result as LibraryTrack;
        return;
      }
      allocateSequence();
    };
    transaction.oncomplete = () => result ? resolve(result) : reject(new Error("Library admission did not complete"));
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
  return admitted;
}

export async function removeLibraryTrack(id: string): Promise<void> {
  const database = await openLibrary();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction("tracks", "readwrite");
    transaction.objectStore("tracks").delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}
