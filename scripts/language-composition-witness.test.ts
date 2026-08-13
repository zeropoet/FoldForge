import { describe, expect, it } from "vitest";
// This module is shared with the Node-based static export builder.
import {
  archiveCandidate,
  lexicalMeaningWitness,
  stabilizeArchiveObservation,
  stabilizeLexicalObservation,
} from "./language-composition-witness.mjs";

const archiveA = { source_works: 292, state_witness: `sha256:${"a".repeat(64)}` };
const archiveB = { source_works: 298, state_witness: `sha256:${"b".repeat(64)}` };

describe("Root Logos language witness stability", () => {
  it("ignores provider metadata changes when witnessing archive identity", () => {
    const first = archiveCandidate([{
      contract: { address: "0xABC" }, tokenId: "1", name: "Provider title A",
    }]);
    const second = archiveCandidate([{
      contract: { address: "0xabc" }, tokenId: "1", name: "Provider title B",
    }]);

    expect(second).toEqual(first);
  });

  it("keeps the lexical meaning witness stable across archive observation changes", () => {
    const base = {
      schema: "foldforge-language-composition-export/v1",
      source_id: "foldforge",
      grammar: { id: "FF-COMP-0002", witness: "grammar" },
      terms: [{ rank: 1, term: "archive", works: 51, traces: 51 }],
      claim: "presence",
      boundary: "not authority",
    };

    expect(lexicalMeaningWitness({ ...base, archive: archiveA }))
      .toBe(lexicalMeaningWitness({ ...base, archive: archiveB }));
  });

  it("does not promote an A to B to A provider oscillation", () => {
    const firstB = stabilizeArchiveObservation({
      candidate: archiveB,
      previousArchive: archiveA,
      previousObservation: null,
    });
    expect(firstB.archive).toEqual(archiveA);
    expect(firstB.observation.confirmations).toBe(1);

    const backToA = stabilizeArchiveObservation({
      candidate: archiveA,
      previousArchive: firstB.archive,
      previousObservation: firstB.observation,
    });
    expect(backToA.archive).toEqual(archiveA);
    expect(backToA.observation.promoted).toBe(false);
  });

  it("promotes an archive change only after two consecutive observations", () => {
    const first = stabilizeArchiveObservation({
      candidate: archiveB,
      previousArchive: archiveA,
      previousObservation: null,
    });
    const second = stabilizeArchiveObservation({
      candidate: archiveB,
      previousArchive: first.archive,
      previousObservation: first.observation,
    });

    expect(second.archive).toEqual(archiveB);
    expect(second.observation.promoted).toBe(true);
  });

  it("rejects a one-observation lexical oscillation", () => {
    const termsA = [{ rank: 1, term: "archive", works: 51, traces: 51 }];
    const termsB = [{ rank: 1, term: "provider", works: 52, traces: 52 }];
    const firstB = stabilizeLexicalObservation({
      candidateTerms: termsB,
      previousTerms: termsA,
      previousObservation: null,
    });
    const backToA = stabilizeLexicalObservation({
      candidateTerms: termsA,
      previousTerms: firstB.terms,
      previousObservation: firstB.observation,
    });

    expect(firstB.terms).toEqual(termsA);
    expect(backToA.terms).toEqual(termsA);
  });
});
