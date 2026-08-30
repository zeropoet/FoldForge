import { describe, expect, it } from "vitest";
import { buildPrintDocument } from "./print-document";

describe("Dispatch print document", () => {
  it("creates one exact 75 x 50 mm page per label without orientation hints", () => {
    const document = buildPrintDocument(["<svg id=\"one\"></svg>", "<svg id=\"two\"></svg>"]);
    expect(document).toContain("@page { size: 75mm 50mm; margin: 0; }");
    expect(document).toContain(".label-page:last-child { break-after: auto; page-break-after: auto; }");
    expect(document.match(/class=\"label-page\"/g)).toHaveLength(2);
    expect(document.toLowerCase()).not.toContain("landscape");
    expect(document.toLowerCase()).not.toContain("rotate");
  });

  it("refuses to create an empty print job", () => {
    expect(() => buildPrintDocument([])).toThrow("At least one label is required");
  });
});
