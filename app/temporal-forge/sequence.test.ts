import { describe, expect, it } from "vitest";
import { moveFrame, naturalFrameOrder, sequenceDuration } from "./sequence";

describe("Temporal Forge sequence grammar", () => {
  it("orders numbered collection frames naturally", () => {
    const frames = [
      { name: "frame-10.png", lastModified: 1 },
      { name: "frame-2.png", lastModified: 1 },
      { name: "frame-1.png", lastModified: 1 },
    ];
    expect(naturalFrameOrder(frames).map((frame) => frame.name)).toEqual(["frame-1.png", "frame-2.png", "frame-10.png"]);
  });

  it("moves a frame without losing sequence members", () => {
    expect(moveFrame(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
  });

  it("derives loop duration from frame count and cadence", () => {
    expect(sequenceDuration(24, 8)).toBe(3);
    expect(sequenceDuration(0, 8)).toBe(0);
  });
});
