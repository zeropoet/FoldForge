import { describe, expect, it } from "vitest";
import declaration from "../public/foldkernel-integration.json";
import {
  FOLDKERNEL_INTEGRATION,
  projectFoldKernelEvents,
} from "./foldkernel-integration";

describe("FoldKernel integration projection", () => {
  it("matches the exact public contract declaration", () => {
    expect(FOLDKERNEL_INTEGRATION).toEqual({
      contractVersion: declaration.contractVersion,
      protocolVersion: declaration.foldKernel.protocolVersion,
      packageVersion: declaration.foldKernel.packageRequirement.version,
      event: declaration.eventMeanings[0].event,
    });
  });

  it("projects the FoldForge witness without claiming convergence authority", () => {
    const stateHash = `sha256:${"ab".repeat(32)}` as const;
    const projection = projectFoldKernelEvents(stateHash);

    expect(projection.events).toEqual([
      {
        event: "permutation_commit",
        owner: "FoldForge",
        applicationWitness: stateHash,
      },
    ]);
    expect(JSON.stringify(projection)).not.toContain("convergenceHash");
  });
});
