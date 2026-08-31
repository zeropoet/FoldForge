export const FOLDKERNEL_INTEGRATION = {
  contractVersion: "FoldKernel-Integration-1.0.0",
  protocolVersion: "FoldKernel-1.0.0",
  packageVersion: "1.0.5",
  event: "permutation_commit",
} as const;

export interface FoldKernelProjection {
  contractVersion: typeof FOLDKERNEL_INTEGRATION.contractVersion;
  protocolVersion: typeof FOLDKERNEL_INTEGRATION.protocolVersion;
  packageVersion: typeof FOLDKERNEL_INTEGRATION.packageVersion;
  events: Array<{
    event: typeof FOLDKERNEL_INTEGRATION.event;
    owner: "FoldForge";
    applicationWitness: `sha256:${string}`;
  }>;
}

/**
 * Projects a completed FoldForge witness into FoldKernel's shared event
 * vocabulary. The application witness remains FoldForge-owned and is not
 * presented as a FoldKernel convergence hash.
 */
export function projectFoldKernelEvents(
  stateHash: `sha256:${string}`,
): FoldKernelProjection {
  return {
    contractVersion: FOLDKERNEL_INTEGRATION.contractVersion,
    protocolVersion: FOLDKERNEL_INTEGRATION.protocolVersion,
    packageVersion: FOLDKERNEL_INTEGRATION.packageVersion,
    events: [
      {
        event: FOLDKERNEL_INTEGRATION.event,
        owner: "FoldForge",
        applicationWitness: stateHash,
      },
    ],
  };
}
