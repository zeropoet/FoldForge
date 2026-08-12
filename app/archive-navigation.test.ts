import { describe, expect, it } from "vitest";
import { adjacentTokenId, isTextEntryTarget, mintedWorkHref } from "./archive-navigation";

describe("minted-work sequence navigation", () => {
  const tokenIds = ["1", "3", "8"];

  it("moves through the collection's displayed order", () => {
    expect(adjacentTokenId(tokenIds, "3", -1)).toBe("1");
    expect(adjacentTokenId(tokenIds, "3", 1)).toBe("8");
  });

  it("stops at collection boundaries and for unknown works", () => {
    expect(adjacentTokenId(tokenIds, "1", -1)).toBeNull();
    expect(adjacentTokenId(tokenIds, "8", 1)).toBeNull();
    expect(adjacentTokenId(tokenIds, "5", 1)).toBeNull();
  });

  it("does not claim arrow keys from text-entry controls", () => {
    expect(isTextEntryTarget({ tagName: "INPUT" } as unknown as EventTarget)).toBe(true);
    expect(isTextEntryTarget({ tagName: "TEXTAREA" } as unknown as EventTarget)).toBe(true);
    expect(isTextEntryTarget({ tagName: "SELECT" } as unknown as EventTarget)).toBe(true);
    expect(isTextEntryTarget({ tagName: "DIV", isContentEditable: true } as unknown as EventTarget)).toBe(true);
    expect(isTextEntryTarget({ tagName: "A" } as unknown as EventTarget)).toBe(false);
  });

  it("builds a shareable route without losing special characters", () => {
    expect(mintedWorkHref("zero poet.eth", "0xabc", "12/3")).toBe(
      "?owner=zero+poet.eth&collection=0xabc&token=12%2F3",
    );
  });
});
