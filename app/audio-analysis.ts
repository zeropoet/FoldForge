export interface AudioSignature {
  schema: "foldforge-audio-signature/v1";
  duration: number;
  sampleRate: number;
  channels: number;
  rms: number;
  peak: number;
  dynamicRange: number;
  zeroCrossingRate: number;
  lowFrequencyEnergy: number;
  onsetDensity: number;
  tonalConfidence: number;
}

export const audioExtensions = /\.(aac|aif|aiff|alac|flac|m4a|mp3|oga|ogg|opus|wav)(?:$|[?#])/i;

export function isAudioUrl(value: string | null | undefined): boolean {
  return Boolean(value && (audioExtensions.test(value) || /^data:audio\//i.test(value)));
}

export async function analyzeAudio(source: string, signal: AbortSignal): Promise<AudioSignature | null> {
  try {
    const response = await fetch(source, { signal });
    if (!response.ok) return null;
    const context = new AudioContext();
    try {
      const buffer = await context.decodeAudioData(await response.arrayBuffer());
      const stride = Math.max(1, Math.floor(buffer.sampleRate / 12_000));
      let sum = 0, peak = 0, crossings = 0, lowSum = 0, count = 0, prior = 0, low = 0;
      const blocks: number[] = [];
      const blockSize = Math.max(1, Math.floor(buffer.sampleRate / stride * 0.05));
      let blockSum = 0, blockCount = 0;
      for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
        const data = buffer.getChannelData(channel);
        for (let index = 0; index < data.length; index += stride) {
          const sample = data[index];
          sum += sample * sample;
          peak = Math.max(peak, Math.abs(sample));
          if ((sample >= 0) !== (prior >= 0)) crossings += 1;
          prior = sample;
          low += 0.055 * (sample - low);
          lowSum += low * low;
          blockSum += sample * sample;
          blockCount += 1;
          count += 1;
          if (blockCount >= blockSize) {
            blocks.push(Math.sqrt(blockSum / blockCount));
            blockSum = 0;
            blockCount = 0;
          }
        }
      }
      const rms = Math.sqrt(sum / Math.max(1, count));
      const sorted = [...blocks].sort((a, b) => a - b);
      const p10 = sorted[Math.floor(sorted.length * 0.1)] ?? 0;
      const p90 = sorted[Math.floor(sorted.length * 0.9)] ?? peak;
      let onsets = 0;
      for (let index = 1; index < blocks.length; index += 1) if (blocks[index] > blocks[index - 1] * 1.7 && blocks[index] > rms * 0.45) onsets += 1;
      const zcr = crossings / Math.max(1, count);
      return {
        schema: "foldforge-audio-signature/v1",
        duration: buffer.duration,
        sampleRate: buffer.sampleRate,
        channels: buffer.numberOfChannels,
        rms,
        peak,
        dynamicRange: Math.max(0, 20 * Math.log10(Math.max(p90, 1e-8) / Math.max(p10, 1e-8))),
        zeroCrossingRate: zcr,
        lowFrequencyEnergy: Math.min(1, Math.sqrt(lowSum / Math.max(1, count)) / Math.max(rms, 1e-8)),
        onsetDensity: onsets / Math.max(buffer.duration / 60, 1 / 60),
        tonalConfidence: Math.max(0, Math.min(1, 1 - zcr * 12)),
      };
    } finally {
      await context.close();
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return null;
  }
}
