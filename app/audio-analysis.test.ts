import { describe, expect, it } from "vitest";
import { isAudioUrl } from "./audio-analysis";

describe("audio media detection", () => {
  it("recognizes canonical audio formats through query strings", () => {
    expect(isAudioUrl("https://example.com/work.flac?token=1")).toBe(true);
    expect(isAudioUrl("ipfs://bafy/work.m4a#media")).toBe(true);
    expect(isAudioUrl("data:audio/wav;base64,UklGRg==")).toBe(true);
  });

  it("does not reinterpret image or video evidence as audio", () => {
    expect(isAudioUrl("https://example.com/cover.png")).toBe(false);
    expect(isAudioUrl("https://example.com/animation.mp4")).toBe(false);
    expect(isAudioUrl(null)).toBe(false);
  });
});
