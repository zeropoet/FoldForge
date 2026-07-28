import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const foldforgeRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const rootLogosRoot = resolve(process.argv[2] || resolve(foldforgeRoot, "../root-logos"));
const readJson = async (path) => JSON.parse(await readFile(resolve(rootLogosRoot, path), "utf8"));

const [
  graph,
  worksIndex,
  corpus,
  cultivation,
  memory,
  attractors,
  identity,
  livingObjectSource,
] = await Promise.all([
  readJson("content/constitutional-graph.json"),
  readJson("works/index.json"),
  readJson("works/corpora/original-douay-rheims.json"),
  readJson("cultivation/state.json"),
  readJson("cultivation/memory.json"),
  readJson("content/attractor-packets.json"),
  readJson("self-authorship/current.json"),
  readFile(resolve(rootLogosRoot, "living-object.js"), "utf8"),
]);

const works = worksIndex.works || [];
const independentWorks = works.filter(
  (work) => !String(work.collection || "").includes("Douay") && work.edition,
);
const independentEditions = new Map(
  (await Promise.all(independentWorks.map(async (work) => {
    try {
      return [work.work_id, await readJson(work.edition)];
    } catch {
      return [work.work_id, null];
    }
  }))).filter(([, edition]) => edition),
);

const palette = {
  constitutional: [0.80, 0.72, 0.46, 0.68],
  canon: [0.54, 0.78, 0.80, 0.7],
  literature: [0.68, 0.52, 0.83, 0.76],
  contemplative: [0.90, 0.34, 0.22, 0.8],
  native: [0.54, 0.76, 0.57, 0.78],
  lineage: [0.92, 0.84, 0.56, 0.92],
  structure: [0.36, 0.48, 0.49, 0.2],
};
const hash = (value) => {
  let result = 2166136261;
  for (const character of String(value)) {
    result ^= character.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0) / 4294967295;
};

const functionStart = livingObjectSource.indexOf("  function formGeometry(");
const functionEnd = livingObjectSource.indexOf("  function createRenderer(", functionStart);
if (functionStart < 0 || functionEnd < 0) {
  throw new Error("Root Logos formGeometry function could not be located.");
}
const formGeometrySource = livingObjectSource.slice(functionStart, functionEnd);
const generatorWitness = createHash("sha256").update(formGeometrySource).digest("hex");
const formGeometry = new Function(
  "palette",
  "hash",
  `${formGeometrySource}\nreturn formGeometry;`,
)(palette, hash);
const geometry = formGeometry({
  graph,
  works,
  corpus,
  cultivation,
  memory,
  attractors,
  independentEditions,
});

const vertices = [];
for (let index = 0; index < geometry.points.length; index += 10) {
  vertices.push({
    x: geometry.points[index],
    y: geometry.points[index + 1],
    z: geometry.points[index + 2],
    alpha: geometry.points[index + 6],
    size: geometry.points[index + 7],
  });
}
for (const field of [geometry.lines, geometry.facets]) {
  for (let index = 0; index < field.length; index += 10) {
    vertices.push({
      x: field[index],
      y: field[index + 1],
      z: field[index + 2],
      alpha: field[index + 6],
      size: 1,
    });
  }
}
const minimumY = Math.min(...vertices.map(({ y }) => y));
const maximumY = Math.max(...vertices.map(({ y }) => y));
const maximumRadius = Math.max(...vertices.map(({ x, z }) => Math.hypot(x, z))) || 1;
const sampleCount = 64;
const bandwidth = 0.055;
const rawSamples = Array.from({ length: sampleCount }, (_, index) => {
  const position = index / (sampleCount - 1);
  let weightTotal = 0;
  let radiusTotal = 0;
  let radiusMaximum = 0;
  let centroidX = 0;
  let centroidZ = 0;
  let density = 0;

  for (const vertex of vertices) {
    const normalizedY = (vertex.y - minimumY) / Math.max(maximumY - minimumY, Number.EPSILON);
    const distance = Math.abs(normalizedY - position);
    if (distance > bandwidth * 3) continue;
    const weight = Math.exp(-0.5 * (distance / bandwidth) ** 2) * vertex.alpha * Math.sqrt(vertex.size);
    const radius = Math.hypot(vertex.x, vertex.z);
    weightTotal += weight;
    radiusTotal += radius * weight;
    radiusMaximum = Math.max(radiusMaximum, radius * Math.exp(-0.5 * (distance / bandwidth) ** 2));
    centroidX += vertex.x * weight;
    centroidZ += vertex.z * weight;
    density += weight;
  }

  return {
    position,
    radius: weightTotal ? ((radiusTotal / weightTotal) * 0.65 + radiusMaximum * 0.35) / maximumRadius : 0,
    density,
    centroidX: weightTotal ? centroidX / weightTotal / maximumRadius : 0,
    centroidZ: weightTotal ? centroidZ / weightTotal / maximumRadius : 0,
  };
});
const maximumDensity = Math.max(...rawSamples.map(({ density }) => density)) || 1;
const normalizedSamples = rawSamples.map((sample) => ({
  ...sample,
  density: Math.log1p(sample.density) / Math.log1p(maximumDensity),
  radius: Math.min(1, sample.radius),
}));
const neutral = {
  radius: normalizedSamples.reduce((total, sample) => total + sample.radius, 0) / sampleCount,
  density: normalizedSamples.reduce((total, sample) => total + sample.density, 0) / sampleCount,
  centroidX: normalizedSamples.reduce((total, sample) => total + sample.centroidX, 0) / sampleCount,
  centroidZ: normalizedSamples.reduce((total, sample) => total + sample.centroidZ, 0) / sampleCount,
};
const maximumDeviation = (field) => Math.max(
  ...normalizedSamples.map((sample) => Math.abs(sample[field] - neutral[field])),
) || 1;
const radiusDeviation = maximumDeviation("radius");
const densityDeviation = maximumDeviation("density");
const samples = normalizedSamples.map((sample, index) => {
  const previousRadius = normalizedSamples[Math.max(0, index - 1)].radius;
  const nextRadius = normalizedSamples[Math.min(normalizedSamples.length - 1, index + 1)].radius;
  const radialMotion = Math.max(-1, Math.min(1, (nextRadius - previousRadius) * 7));
  const radialDisplacement = (sample.radius - neutral.radius) / radiusDeviation;
  const densityDisplacement = (sample.density - neutral.density) / densityDeviation;
  const energyDisplacement = Math.max(-1, Math.min(1,
    radialDisplacement * 0.5 + densityDisplacement * 0.35 + radialMotion * 0.15,
  ));
  return {
    position: Number(sample.position.toFixed(6)),
    radialDisplacement: Number(radialDisplacement.toFixed(6)),
    densityDisplacement: Number(densityDisplacement.toFixed(6)),
    horizontalDisplacement: Number((sample.centroidX - neutral.centroidX).toFixed(6)),
    depthDisplacement: Number((sample.centroidZ - neutral.centroidZ).toFixed(6)),
    radialMotion: Number(radialMotion.toFixed(6)),
    energyDisplacement: Number(energyDisplacement.toFixed(6)),
  };
});

const witnessInput = JSON.stringify({
  revision: identity.revision,
  generatorWitness,
  graph: graph.meta,
  works: works.map(({ work_id, edition }) => [work_id, edition]),
  corpus: corpus.witness || corpus.meta || corpus.title,
  cultivation: cultivation.next_cycle,
  pointCount: vertices.length,
});
const witness = createHash("sha256").update(witnessInput).digest("hex");
const output = {
  schema: "foldforge-root-logos-displacement-map/v1",
  source: {
    name: "Root Logos Living Object",
    revision: identity.revision || graph.meta?.revision || "unresolved",
    generator: "living-object.js/formGeometry",
    generatorWitness: `sha256:${generatorWitness}`,
    witness: `sha256:${witness}`,
    pointCount: vertices.length,
    bounds: {
      minimumY: Number(minimumY.toFixed(6)),
      maximumY: Number(maximumY.toFixed(6)),
      maximumRadius: Number(maximumRadius.toFixed(6)),
    },
  },
  interpretation: {
    direction: "root-to-crown",
    samples: sampleCount,
    neutral: {
      radius: Number(neutral.radius.toFixed(6)),
      density: Number(neutral.density.toFixed(6)),
      centroidX: Number(neutral.centroidX.toFixed(6)),
      centroidZ: Number(neutral.centroidZ.toFixed(6)),
    },
    radialDisplacement: "signed deviation from mean cross-sectional extent",
    densityDisplacement: "signed deviation from mean log-normalized structural density",
    horizontalDisplacement: "horizontal centroid offset from the form-wide mean",
    depthDisplacement: "depth centroid offset from the form-wide mean",
    radialMotion: "signed local change in cross-sectional extent",
    energyDisplacement: "radial displacement 0.50 + density displacement 0.35 + radial motion 0.15",
  },
  samples,
};

const outputPath = resolve(foldforgeRoot, "public/root-logos-living-object-displacement.json");
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Wrote ${outputPath} from ${vertices.length} Root Logos geometry vertices.`);
