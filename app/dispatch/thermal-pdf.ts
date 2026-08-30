import { PDFDocument } from "pdf-lib";

export const THERMAL_WIDTH_POINTS = 75 * 72 / 25.4;
export const THERMAL_HEIGHT_POINTS = 50 * 72 / 25.4;
const THERMAL_WIDTH_PIXELS = 600;
const THERMAL_HEIGHT_PIXELS = 400;

async function svgToPng(svg: SVGSVGElement): Promise<Uint8Array> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("width", String(THERMAL_WIDTH_PIXELS));
  clone.setAttribute("height", String(THERMAL_HEIGHT_PIXELS));
  clone.removeAttribute("class");
  const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.decoding = "sync";
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("A selected label could not be rasterized"));
      image.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = THERMAL_WIDTH_PIXELS;
    canvas.height = THERMAL_HEIGHT_PIXELS;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Local label rasterizer is unavailable");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const png = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("A selected label could not be encoded")), "image/png"));
    return new Uint8Array(await png.arrayBuffer());
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function buildThermalPdfFromPngs(pngPages: Uint8Array[]): Promise<Uint8Array> {
  if (!pngPages.length) throw new Error("At least one label is required");
  const pdf = await PDFDocument.create();
  for (const pngBytes of pngPages) {
    const image = await pdf.embedPng(pngBytes);
    const page = pdf.addPage([THERMAL_WIDTH_POINTS, THERMAL_HEIGHT_POINTS]);
    page.drawImage(image, { x: 0, y: 0, width: THERMAL_WIDTH_POINTS, height: THERMAL_HEIGHT_POINTS });
  }
  return pdf.save({ useObjectStreams: false });
}

export async function buildThermalPdf(labels: SVGSVGElement[]): Promise<Uint8Array> {
  const pngPages = [];
  for (const label of labels) pngPages.push(await svgToPng(label));
  return buildThermalPdfFromPngs(pngPages);
}

export function bytesToBase64(bytes: Uint8Array): string {
  let value = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) value += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  return btoa(value);
}
