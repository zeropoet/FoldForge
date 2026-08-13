import { describe, expect, it } from "vitest";
import { composeCouplets, inspectCouplet } from "./relation-grammar";

describe("Witness Couplet grammar", () => {
  it("composes deterministic two-line relations from confirmed evidence", () => {
    const input = { event: "placed" as const, systemTerm: "vessel" as const, livedField: "an established ritual", visibleEvidence: ["A vessel rests beside an iron pot"], seed: "sha256:test" };
    expect(composeCouplets(input)).toEqual(composeCouplets(input));
    expect(composeCouplets(input).length).toBeGreaterThanOrEqual(2);
    expect(composeCouplets(input)[0].lines).toHaveLength(2);
  });

  it("rejects promotional and overlong utterances", () => {
    expect(inspectCouplet(["Buy the perfect premium vessel today.", "An unforgettable luxury journey begins here."]).valid).toBe(false);
  });

  it("accepts a concise field-bearing couplet", () => {
    expect(inspectCouplet(["The vessel takes its place.", "An established ritual makes room."]).valid).toBe(true);
  });
});
