export interface VisualSignature {
  luminance: number;
  hue: number;
  saturation: number;
  contrast: number;
  edgeEnergy: number;
  balance: number;
  focusX: number;
  focusY: number;
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
    contrast: Math.min(1, Math.sqrt(variance / count) * 2),
    edgeEnergy: Math.min(1, edgeEnergy / Math.max(edgeCount, 1) * 4),
    balance: totalSideMass ? 1 - Math.abs(leftMass - rightMass) / totalSideMass : 1,
    focusX: mass ? momentX / mass : 0.5,
    focusY: mass ? momentY / mass : 0.5,
  };
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
