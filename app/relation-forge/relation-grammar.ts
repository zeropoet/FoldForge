export const grammar = {
  id: "FF-COMP-0006",
  version: "0.1.0-proposal",
  rootLogosRevision: "v1.4",
  maximumWordsPerLine: 8,
  maximumTotalWords: 14,
  systemTerms: ["vessel", "unit", "fill", "claim", "archive", "record", "return", "continuation"] as const,
  forbidden: ["buy", "shop", "limited", "exclusive", "premium", "luxury", "perfect", "discover", "experience", "journey", "unforgettable", "must-have"],
} as const;

export type SystemTerm = typeof grammar.systemTerms[number];
export type EventState = "received" | "opened" | "placed" | "prepared" | "returned" | "held";

export interface CoupletInput {
  event: EventState;
  systemTerm: SystemTerm;
  livedField: string;
  visibleEvidence: string[];
  seed: string;
}

export interface Couplet {
  id: string;
  lines: [string, string];
  sourceEvidence: string[];
  movement: string;
}

export interface ConstraintResult {
  valid: boolean;
  checks: Array<{ label: string; passed: boolean }>;
}

const capitalize = (value: string) => value ? `${value[0].toLocaleUpperCase()}${value.slice(1)}` : value;
const cleanPhrase = (value: string) => value.trim().replace(/[.!?]+$/u, "").replace(/\s+/g, " ");
const sentence = (value: string) => `${capitalize(cleanPhrase(value))}.`;
const words = (value: string) => value.trim().split(/\s+/u).filter(Boolean);

function stableNumber(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function eventLine(event: EventState, term: SystemTerm): string {
  const articles: Record<SystemTerm, string> = {
    vessel: "The vessel", unit: "The unit", fill: "The first fill", claim: "The claim",
    archive: "The archive", record: "The record", return: "The return", continuation: "Continuation",
  };
  const verbs: Record<EventState, string> = {
    received: "arrives", opened: "opens", placed: "takes its place",
    prepared: "enters the day", returned: "returns", held: "is held",
  };
  return `${articles[term]} ${verbs[event]}.`;
}

function relationLine(event: EventState, field: string): string {
  const clean = cleanPhrase(field) || "the day";
  const templates: Record<EventState, string[]> = {
    received: [`${clean} makes room`, `${clean} receives a record`],
    opened: [`${clean} begins to continue`, `The vessel enters ${clean}`],
    placed: [`${clean} makes room`, `Placement becomes relation`],
    prepared: [`The vessel remains with ${clean}`, `${clean} acquires a record`],
    returned: [`The record meets ${clean} again`, `${clean} continues through return`],
    held: [`${clean} gives the unit duration`, `The record enters ${clean}`],
  };
  return sentence(templates[event][stableNumber(`${event}:${clean}`) % templates[event].length]);
}

export function composeCouplets(input: CoupletInput): Couplet[] {
  const field = cleanPhrase(input.livedField);
  const evidence = input.visibleEvidence.map(cleanPhrase).filter(Boolean);
  const observed = evidence[stableNumber(input.seed) % Math.max(1, evidence.length)];
  const candidates: Array<{ lines: [string, string]; movement: string }> = [
    { lines: [eventLine(input.event, input.systemTerm), relationLine(input.event, field)], movement: "state → relation" },
    ...(observed ? [{ lines: [sentence(observed), relationLine(input.event, field)] as [string, string], movement: "observation → relation" }] : []),
    { lines: [relationLine(input.event, field), eventLine(input.event, input.systemTerm)], movement: "relation → persistence" },
  ];

  return candidates
    .filter(({ lines }, index, all) => all.findIndex((candidate) => candidate.lines.join("\n") === lines.join("\n")) === index)
    .map((candidate, index) => ({
      id: `${stableNumber(`${input.seed}:${candidate.lines.join(":")}:${index}`).toString(16).padStart(8, "0")}`,
      ...candidate,
      sourceEvidence: evidence,
    }));
}

export function inspectCouplet(lines: [string, string]): ConstraintResult {
  const lower = lines.join(" ").toLocaleLowerCase();
  const lineCounts = lines.map((line) => words(line).length);
  const systemCount = grammar.systemTerms.filter((term) => new RegExp(`\\b${term}\\b`, "u").test(lower)).length;
  const checks = [
    { label: "two lines", passed: lines.length === 2 && lines.every((line) => cleanPhrase(line).length > 0) },
    { label: `≤ ${grammar.maximumWordsPerLine} words per line`, passed: lineCounts.every((count) => count <= grammar.maximumWordsPerLine) },
    { label: `≤ ${grammar.maximumTotalWords} words total`, passed: lineCounts.reduce((sum, count) => sum + count, 0) <= grammar.maximumTotalWords },
    { label: "one or two field terms", passed: systemCount >= 1 && systemCount <= 2 },
    { label: "no promotional language", passed: grammar.forbidden.every((term) => !new RegExp(`\\b${term}\\b`, "u").test(lower)) },
  ];
  return { valid: checks.every((check) => check.passed), checks };
}
