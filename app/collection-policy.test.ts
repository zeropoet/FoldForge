import { describe, expect, it } from "vitest";
import { isCollectionAllowed } from "./collection-policy";

describe("zeropoet.eth collection policy", () => {
  it.each([
    "0x1066d77f2b0ffe7a667e95ebc442866088ab1248",
    "0x57f1887a8bf19b14fc0df6fd9b2acc9af147ea85",
    "0x1e3b1154aedee78e10d67aa0001ab5c5b4d1143b",
  ])("removes %s from the visible holdings", (contract) => {
    expect(isCollectionAllowed("zeropoet.eth", contract)).toBe(false);
    expect(isCollectionAllowed("ZEROPOET.ETH", contract.toUpperCase())).toBe(false);
  });

  it("does not apply one world's curation to another owner", () => {
    expect(isCollectionAllowed(
      "another.eth",
      "0x57f1887a8bf19b14fc0df6fd9b2acc9af147ea85",
    )).toBe(true);
  });
});
