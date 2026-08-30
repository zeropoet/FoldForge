import { describe, expect, it } from "vitest";
import { buildPrintDocument } from "./print-document";

describe("Dispatch print document", () => {
  it("counter-rotates each label once against the fixed MUNBYN driver orientation", () => {
    const document = buildPrintDocument(["<svg id=\"one\"></svg>", "<svg id=\"two\"></svg>"]);
    expect(document).toContain("@page { size: 50mm 75mm; margin: 0; }");
    expect(document).toContain("width: 50mm; height: 75mm");
    expect(document).toContain("rotate(-90deg)");
    expect(document).toContain(".label-page:last-child { break-after: auto; page-break-after: auto; }");
    expect(document.match(/class=\"label-page\"/g)).toHaveLength(2);
    expect(document.toLowerCase()).not.toContain("landscape");
  });

  it("refuses to create an empty print job", () => {
    expect(() => buildPrintDocument([])).toThrow("At least one label is required");
  });
});
