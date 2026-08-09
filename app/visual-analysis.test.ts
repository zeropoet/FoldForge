import { describe, expect, it } from "vitest";
import {
  analyzePixels,
  composeChromaticSequence,
  type VisualSignature,
} from "./visual-analysis";

function signature(
  perceptualHue: number,
  chroma: number,
  perceptualLightness = 0.5,
): VisualSignature {
  return {
    luminance: perceptualLightness,
    hue: perceptualHue,
    saturation: chroma,
    perceptualLightness,
    perceptualHue,
    chroma,
    contrast: 0,
    edgeEnergy: 0,
    balance: 1,
    focusX: 0.5,
    focusY: 0.5,
  };
}

describe("Chromatic Field", () => {
  it("measures source pixels in OKLab without replacing perceived luminance", () => {
    const measured = analyzePixels(new Uint8ClampedArray([255, 0, 0, 255]), 1, 1);

    expect(measured?.luminance).toBeCloseTo(0.2126, 4);
    expect(measured?.perceptualLightness).toBeCloseTo(0.628, 3);
    expect(measured?.chroma).toBeCloseTo(0.2577, 3);
    expect(measured?.perceptualHue).toBeCloseTo(29.23, 1);
  });

  it("keeps achromatic works in a dark-to-light ground", () => {
    const arranged = composeChromaticSequence([
      { key: "red", visual: signature(10, 0.2) },
      { key: "white", visual: signature(0, 0.001, 0.9) },
      { key: "black", visual: signature(0, 0, 0.1) },
      { key: "green", visual: signature(100, 0.2) },
      { key: "blue", visual: signature(200, 0.2) },
    ]);

    expect(arranged.map(({ key }) => key)).toEqual(["black", "white", "red", "green", "blue"]);
  });

  it("begins the circular continuum after the archive's largest empty hue interval", () => {
    const arranged = composeChromaticSequence([
      { key: "h040", visual: signature(40, 0.2) },
      { key: "h100", visual: signature(100, 0.2) },
      { key: "h300", visual: signature(300, 0.2) },
    ]);

    expect(arranged.map(({ key }) => key)).toEqual(["h300", "h040", "h100"]);
  });
});
