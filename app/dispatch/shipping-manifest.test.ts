import { describe, expect, it } from "vitest";
import { addressLines, fittedFontSize, parseShippingManifest } from "./shipping-manifest";

const manifest = {
  schema: "sovereign-standard-shipping-manifest/v1",
  manifest_date: "2026-08-31",
  label_size_inches: { width: 3, height: 2 },
  origin: { name: "Sovereign Standard", address: { line1: "1 Origin Road", line2: "", city: "St Petersburg", state: "FL", postal_code: "33705", country: "US" } },
  shipments: [{ shipment_id: "ss-abc", order_id: "order-1", fulfilled_at: "2026-08-31T12:00:00Z", vessel: 42, recipient: { name: "Ada Collector", address: { line1: "2 Main Street", line2: "Apt 4", city: "Columbus", state: "OH", postal_code: "43215", country: "US" } } }],
};

describe("Dispatch manifest", () => {
  it("admits the canonical private weekly manifest", () => {
    const parsed = parseShippingManifest(JSON.stringify(manifest));
    expect(parsed.shipments).toHaveLength(1);
    expect(parsed.shipments[0].vessel).toBe(42);
    expect(addressLines(parsed.shipments[0].recipient.address)).toEqual(["2 Main Street", "Apt 4", "Columbus, OH 43215"]);
  });

  it("rejects incomplete and duplicate delivery evidence", () => {
    const duplicate = { ...manifest, shipments: [manifest.shipments[0], manifest.shipments[0]] };
    expect(() => parseShippingManifest(JSON.stringify(duplicate))).toThrow("Duplicate shipment id");
    const incomplete = structuredClone(manifest);
    incomplete.shipments[0].recipient.address.postal_code = "";
    expect(() => parseShippingManifest(JSON.stringify(incomplete))).toThrow("postal_code is required");
  });

  it("scales long label lines without dropping below the legibility floor", () => {
    expect(fittedFontSize("ADA COLLECTOR", 11, 26, 7)).toBe(11);
    expect(fittedFontSize("A VERY LONG COLLECTOR NAME THAT MUST FIT", 11, 26, 7)).toBeGreaterThanOrEqual(7);
  });
});
