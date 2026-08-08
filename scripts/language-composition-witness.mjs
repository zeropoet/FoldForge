import { createHash } from "node:crypto";

export const stable = (value) => {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
};

export const digest = (value) => createHash("sha256")
  .update(JSON.stringify(stable(value)))
  .digest("hex");

export const archiveCandidate = (tokens) => {
  const identities = [...new Map(tokens.map((token) => {
    const contract = token.contract?.address?.toLowerCase() || "";
    const tokenId = String(token.tokenId ?? "");
    return [`${contract}:${tokenId}`, { contract, token_id: tokenId }];
  })).values()]
    .filter(({ contract, token_id: tokenId }) => contract && tokenId)
    .sort((left, right) =>
      left.contract.localeCompare(right.contract) || left.token_id.localeCompare(right.token_id)
    );

  return {
    source_works: identities.length,
    state_witness: `sha256:${digest(identities)}`,
  };
};

export const lexicalMeaningPayload = (composition) => ({
  schema: composition.schema,
  source_id: composition.source_id,
  grammar: composition.grammar,
  terms: composition.terms,
  claim: composition.claim,
  boundary: composition.boundary,
});

export const lexicalMeaningWitness = (composition) =>
  `sha256:${digest(lexicalMeaningPayload(composition))}`;

const sameArchive = (left, right) => Boolean(left && right
  && left.source_works === right.source_works
  && left.state_witness === right.state_witness);

export const stabilizeArchiveObservation = ({
  candidate,
  previousArchive,
  previousObservation,
  confirmationsRequired = 2,
}) => {
  const confirmed = previousArchive?.source_works != null && previousArchive?.state_witness
    ? {
        source_works: previousArchive.source_works,
        state_witness: previousArchive.state_witness,
      }
    : candidate;

  if (sameArchive(candidate, confirmed)) {
    return {
      archive: confirmed,
      observation: {
        schema: "foldforge-language-archive-observation/v1",
        candidate,
        confirmations: confirmationsRequired,
        promoted: false,
      },
    };
  }

  const confirmations = sameArchive(candidate, previousObservation?.candidate)
    ? Number(previousObservation.confirmations || 0) + 1
    : 1;
  const promoted = confirmations >= confirmationsRequired;

  return {
    archive: promoted ? candidate : confirmed,
    observation: {
      schema: "foldforge-language-archive-observation/v1",
      candidate,
      confirmations,
      promoted,
    },
  };
};

export const stabilizeLexicalObservation = ({
  candidateTerms,
  previousTerms,
  previousObservation,
  confirmationsRequired = 2,
}) => {
  if (!Array.isArray(previousTerms) || previousTerms.length === 0) {
    return {
      terms: candidateTerms,
      observation: {
        candidate_terms: candidateTerms,
        candidate_witness: `sha256:${digest(candidateTerms)}`,
        confirmations: confirmationsRequired,
        promoted: true,
      },
    };
  }

  const confirmedWitness = `sha256:${digest(previousTerms)}`;
  const candidateWitness = `sha256:${digest(candidateTerms)}`;
  if (candidateWitness === confirmedWitness) {
    return {
      terms: previousTerms,
      observation: {
        candidate_terms: candidateTerms,
        candidate_witness: candidateWitness,
        confirmations: confirmationsRequired,
        promoted: false,
      },
    };
  }

  const confirmations = candidateWitness === previousObservation?.candidate_witness
    ? Number(previousObservation.confirmations || 0) + 1
    : 1;
  const promoted = confirmations >= confirmationsRequired;
  return {
    terms: promoted ? candidateTerms : previousTerms,
    observation: {
      candidate_terms: candidateTerms,
      candidate_witness: candidateWitness,
      confirmations,
      promoted,
    },
  };
};
