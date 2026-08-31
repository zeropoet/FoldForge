import { describe, expect, it } from "vitest";
import { issueFoldKernelValueReceipt } from "./foldkernel-value-receipt";

describe("FoldKernel Value Receipt 1.0", () => {
  it("matches the canonical Swift and Telos reference vector", () => {
    const receipt = issueFoldKernelValueReceipt({
      eventID: "sonic-master-0001",
      artifactDigest: "a".repeat(64),
      outputKind: "sonic_master",
      periodStart: "2026-08-31",
      periodEnd: "2026-08-31",
    });
    expect(receipt.receiptID).toBe("94ab6b681b56ab012d7d5dc6442a64b9ff84d9f2206da20a7498909f82a7e398");
    expect(receipt.state).toBe("evidenced");
    expect(receipt.monetaryCounterpartCents).toBeNull();
    expect(receipt.transferable).toBe(false);
  });

  it("rejects malformed evidence instead of inventing value", () => {
    expect(() => issueFoldKernelValueReceipt({
      eventID: "master 1",
      artifactDigest: "a".repeat(64),
      outputKind: "sonic_master",
      periodStart: "2026-08-31",
      periodEnd: "2026-08-31",
    })).toThrow();
  });
});
