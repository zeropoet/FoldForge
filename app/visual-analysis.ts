export interface VisualSignature {
  luminance: number;
  hue: number;
  saturation: number;
  perceptualLightness: number;
  perceptualHue: number;
  chroma: number;
  contrast: number;
  edgeEnergy: number;
  balance: number;
  focusX: number;
  focusY: number;
}

export const ACHROMATIC_CHROMA_THRESHOLD = 0.02;

function linearizeSrgb(channel: number): number {
  return channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4;
}

function srgbToOklab(red: number, green: number, blue: number) {
  const r = linearizeSrgb(red);
  const g = linearizeSrgb(green);
  const b = linearizeSrgb(blue);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return {
    lightness: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

export function analyzePixels(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): VisualSignature | null {
  if (!width || !height || pixels.length < width * height * 4) return null;

  const luminances = new Float64Array(width * height);
  let luminance = 0;
  let saturation = 0;
  let hueX = 0;
  let hueY = 0;
  let chromaWeight = 0;
  let perceptualLightness = 0;
  let perceptualA = 0;
  let perceptualB = 0;
  let mass = 0;
  let momentX = 0;
  let momentY = 0;

  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const index = pixel * 4;
    const alpha = pixels[index + 3] / 255;
    const red = (pixels[index] / 255) * alpha;
    const green = (pixels[index + 1] / 255) * alpha;
    const blue = (pixels[index + 2] / 255) * alpha;
    const value = Math.max(red, green, blue);
    const minimum = Math.min(red, green, blue);
    const chroma = value - minimum;
    const light = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    const sat = value ? chroma / value : 0;
    const oklab = srgbToOklab(red, green, blue);
    let hue = 0;
    if (chroma) {
      if (value === red) hue = ((green - blue) / chroma) % 6;
      else if (value === green) hue = (blue - red) / chroma + 2;
      else hue = (red - green) / chroma + 4;
      hue = ((hue * 60) + 360) % 360;
    }

    luminances[pixel] = light;
    luminance += light;
    saturation += sat;
    const weight = chroma * alpha;
    hueX += Math.cos((hue * Math.PI) / 180) * weight;
    hueY += Math.sin((hue * Math.PI) / 180) * weight;
    chromaWeight += weight;
    perceptualLightness += oklab.lightness;
    perceptualA += oklab.a;
    perceptualB += oklab.b;

    const visualMass = Math.abs(light - 0.5) + chroma * 0.5;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    mass += visualMass;
    momentX += (x / Math.max(width - 1, 1)) * visualMass;
    momentY += (y / Math.max(height - 1, 1)) * visualMass;
  }

  const count = width * height;
  luminance /= count;
  saturation /= count;
  perceptualLightness /= count;
  perceptualA /= count;
  perceptualB /= count;
  const perceptualChroma = Math.hypot(perceptualA, perceptualB);
  let variance = 0;
  let edgeEnergy = 0;
  let edgeCount = 0;
  let leftMass = 0;
  let rightMass = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const light = luminances[index];
      variance += (light - luminance) ** 2;
      const visualMass = Math.abs(light - 0.5);
      if (x < width / 2) leftMass += visualMass;
      else rightMass += visualMass;
      if (x + 1 < width) {
        edgeEnergy += Math.abs(light - luminances[index + 1]);
        edgeCount += 1;
      }
      if (y + 1 < height) {
        edgeEnergy += Math.abs(light - luminances[index + width]);
        edgeCount += 1;
      }
    }
  }

  const totalSideMass = leftMass + rightMass;
  return {
    luminance,
    hue: chromaWeight
      ? (Math.atan2(hueY, hueX) * 180 / Math.PI + 360) % 360
      : 0,
    saturation,
    perceptualLightness,
    perceptualHue: perceptualChroma
      ? (Math.atan2(perceptualB, perceptualA) * 180 / Math.PI + 360) % 360
      : 0,
    chroma: perceptualChroma,
    contrast: Math.min(1, Math.sqrt(variance / count) * 2),
    edgeEnergy: Math.min(1, edgeEnergy / Math.max(edgeCount, 1) * 4),
    balance: totalSideMass ? 1 - Math.abs(leftMass - rightMass) / totalSideMass : 1,
    focusX: mass ? momentX / mass : 0.5,
    focusY: mass ? momentY / mass : 0.5,
  };
}

function chromaticTieBreak<T extends { key: string; visual: VisualSignature | null }>(left: T, right: T): number {
  return (left.visual?.perceptualHue ?? 0) - (right.visual?.perceptualHue ?? 0) ||
    (left.visual?.chroma ?? 0) - (right.visual?.chroma ?? 0) ||
    (left.visual?.perceptualLightness ?? 0) - (right.visual?.perceptualLightness ?? 0) ||
    left.key.localeCompare(right.key);
}

export function composeChromaticSequence<T extends { key: string; visual: VisualSignature | null }>(
  evidence: T[],
): T[] {
  const measured = evidence.filter((entry) => entry.visual);
  const achromatic = measured
    .filter((entry) => (entry.visual?.chroma ?? 0) < ACHROMATIC_CHROMA_THRESHOLD)
    .sort((left, right) =>
      (left.visual?.perceptualLightness ?? 0) - (right.visual?.perceptualLightness ?? 0) ||
      left.key.localeCompare(right.key),
    );
  const chromatic = measured
    .filter((entry) => (entry.visual?.chroma ?? 0) >= ACHROMATIC_CHROMA_THRESHOLD)
    .sort(chromaticTieBreak);

  if (chromatic.length > 1) {
    let seam = 0;
    let largestGap = -1;
    for (let index = 0; index < chromatic.length; index += 1) {
      const next = (index + 1) % chromatic.length;
      const currentHue = chromatic[index].visual?.perceptualHue ?? 0;
      const nextHue = chromatic[next].visual?.perceptualHue ?? 0;
      const gap = (nextHue - currentHue + 360) % 360;
      if (gap > largestGap || (gap === largestGap && chromatic[next].key < chromatic[seam].key)) {
        largestGap = gap;
        seam = next;
      }
    }
    chromatic.push(...chromatic.splice(0, seam));
  }

  const unmeasured = evidence.filter((entry) => !entry.visual);
  return [...achromatic, ...chromatic, ...unmeasured];
}

export function visualDistance(left: VisualSignature, right: VisualSignature): number {
  const hueDifference = Math.abs(left.hue - right.hue);
  const circularHue = Math.min(hueDifference, 360 - hueDifference) / 180;
  return (
    circularHue * 0.24 +
    Math.abs(left.saturation - right.saturation) * 0.14 +
    Math.abs(left.luminance - right.luminance) * 0.16 +
    Math.abs(left.contrast - right.contrast) * 0.14 +
    Math.abs(left.edgeEnergy - right.edgeEnergy) * 0.14 +
    Math.abs(left.balance - right.balance) * 0.08 +
    Math.hypot(left.focusX - right.focusX, left.focusY - right.focusY) / Math.SQRT2 * 0.1
  );
}

export type VisualRelationMode = "continuity" | "counterpoint";

export function composeVisualSequence<T extends { key: string; visual: VisualSignature | null }>(
  evidence: T[],
  mode: VisualRelationMode,
): T[] {
  const remaining = evidence.filter((entry) => entry.visual);
  const sequence: T[] = [];
  let current = remaining.shift();

  while (current) {
    sequence.push(current);
    if (!remaining.length || !current.visual) break;
    const origin = current.visual;
    remaining.sort((left, right) => {
      const leftDistance = left.visual ? visualDistance(origin, left.visual) : 0;
      const rightDistance = right.visual ? visualDistance(origin, right.visual) : 0;
      return (mode === "continuity" ? leftDistance - rightDistance : rightDistance - leftDistance) ||
        left.key.localeCompare(right.key);
    });
    current = remaining.shift();
  }

  return [...sequence, ...evidence.filter((entry) => !entry.visual)];
}
