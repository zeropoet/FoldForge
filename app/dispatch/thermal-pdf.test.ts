import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { buildThermalPdfFromPngs, THERMAL_HEIGHT_POINTS, THERMAL_WIDTH_POINTS } from "./thermal-pdf";

const PIXEL = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+X0Y5WQAAAABJRU5ErkJggg==", "base64"));

describe("Dispatch thermal PDF", () => {
  it("creates one exact 75 x 50 mm page for every selected label", async () => {
    const bytes = await buildThermalPdfFromPngs([PIXEL, PIXEL, PIXEL]);
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(3);
    for (const page of pdf.getPages()) {
      expect(page.getWidth()).toBeCloseTo(THERMAL_WIDTH_POINTS, 5);
      expect(page.getHeight()).toBeCloseTo(THERMAL_HEIGHT_POINTS, 5);
    }
  });

  it("refuses an empty local print job", async () => {
    await expect(buildThermalPdfFromPngs([])).rejects.toThrow("At least one label is required");
  });
});
