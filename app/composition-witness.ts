import { composerGrammars, compositionGrammar } from "./composition-grammar";
import type { VisualSignature } from "./visual-analysis";
import type { AudioSignature } from "./audio-analysis";
import livingObjectDisplacement from "../public/root-logos-living-object-displacement.json";

export interface WitnessToken {
  contract: string;
  tokenId: string;
  media: string | null;
  luminance: number | null;
  visual?: VisualSignature | null;
  audio?: AudioSignature | null;
  modalities?: Array<"image" | "audio" | "language">;
}

export interface CompositionWitness {
  schema: "foldforge-composition-witness/v1";
  stateHash: `sha256:${string}`;
  observedAt: string;
  composition: {
    id: string;
    version: string;
    constitutionRevision: "v0.1";
    completionMilestone: "FF-MILESTONE-0001";
  };
  expressions: Array<{
    id: string;
    version: string;
    modality: "image" | "language" | "sound";
  }>;
  displacementMap: {
    id: "root-logos-living-object";
    revision: string;
    witness: `sha256:${string}`;
    samples: number;
  };
  archive: {
    network: "Ethereum mainnet";
    owner: string;
    address: string;
    includedContracts: string[];
  };
  evidence: {
    tokenCount: number;
    tokens: WitnessToken[];
  };
}

interface WitnessInput {
  owner: string;
  address: string;
  includedContracts: string[];
  tokens: WitnessToken[];
}

export async function createCompositionWitness(input: WitnessInput): Promise<CompositionWitness> {
  const includedContracts = [...input.includedContracts].map((address) => address.toLowerCase()).sort();
  const tokens = [...input.tokens]
    .map((token) => ({
      ...token,
      contract: token.contract.toLowerCase(),
    }))
    .sort((a, b) =>
      a.contract.localeCompare(b.contract) ||
      a.tokenId.localeCompare(b.tokenId),
    );
  const state = {
    composition: {
      id: compositionGrammar.id,
      version: compositionGrammar.version,
      constitutionRevision: "v0.1" as const,
      completionMilestone: "FF-MILESTONE-0001" as const,
    },
    expressions: [
      { id: compositionGrammar.id, version: compositionGrammar.version, modality: "image" as const },
      { id: composerGrammars.language.id, version: composerGrammars.language.version, modality: "language" as const },
      { id: composerGrammars.sound.id, version: composerGrammars.sound.version, modality: "sound" as const },
      { id: composerGrammars.visual.id, version: composerGrammars.visual.version, modality: "image" as const },
      { id: composerGrammars.chromatic.id, version: composerGrammars.chromatic.version, modality: "image" as const },
    ],
    displacementMap: {
      id: "root-logos-living-object" as const,
      revision: livingObjectDisplacement.source.revision,
      witness: livingObjectDisplacement.source.witness as `sha256:${string}`,
      samples: livingObjectDisplacement.samples.length,
    },
    archive: {
      network: "Ethereum mainnet" as const,
      owner: input.owner.toLowerCase(),
      address: input.address.toLowerCase(),
      includedContracts,
    },
    evidence: {
      tokenCount: tokens.length,
      tokens,
    },
  };
  const encoded = new TextEncoder().encode(JSON.stringify(state));
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  const hash = [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return {
    schema: "foldforge-composition-witness/v1",
    stateHash: `sha256:${hash}`,
    observedAt: new Date().toISOString(),
    ...state,
  };
}
