export const instagramGrammar = {
  id: "FF-RELATION-SS-IG-0001",
  version: "1.0.0",
  accountHandle: "@sovereignstandardtea",
  profileDestination: "https://sovereignstandardtea.com/",
  campaign: "instagram-profile-v1",
  forbidden: ["wallet", "crypto", "fulfillment", "shipping", "checkout", "subscribe", "subscription", "price", "pricing", "dollar"],
} as const;

export type CaptionMovement = "stillness" | "ritual" | "relation";
export type ClosingMode = "quiet" | "profile" | "brand";

export interface InstagramObservation {
  subject: string;
  setting: string;
  light: string;
  details: string;
  gesture: string;
  atmosphere: string;
  productTruth: string;
  closing: ClosingMode;
  seed: string;
}

export interface InstagramDraft {
  id: string;
  movement: CaptionMovement;
  caption: string;
  altText: string;
}

export interface DraftInspection {
  valid: boolean;
  checks: Array<{ label: string; passed: boolean }>;
}

const clean = (value: string) => value.trim().replace(/\s+/gu, " ").replace(/[.!?]+$/u, "");
const lowerFirst = (value: string) => value ? `${value[0].toLocaleLowerCase()}${value.slice(1)}` : value;
const upperFirst = (value: string) => value ? `${value[0].toLocaleUpperCase()}${value.slice(1)}` : value;
const sentence = (value: string) => `${upperFirst(clean(value))}.`;

function stableNumber(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function choose<T>(values: readonly T[], seed: string): T {
  return values[stableNumber(seed) % values.length];
}

function contextPhrase(setting: string): string {
  const value = clean(setting);
  return value ? ` ${value}` : "";
}

function lightOpening(subject: string, light: string, setting: string, seed: string): string {
  const heldSubject = clean(subject) || "the Sovereign Standard vessel";
  const heldLight = clean(light);
  const heldSetting = contextPhrase(setting);
  if (!heldLight) return sentence(`${heldSubject}${heldSetting} waits`);
  return sentence(choose([
    `${heldLight} settles across ${lowerFirst(heldSubject)}${heldSetting}`,
    `${heldLight} finds ${lowerFirst(heldSubject)}${heldSetting}`,
    `${heldSubject}${heldSetting} emerges through ${lowerFirst(heldLight)}`,
  ], `${seed}:light`));
}

function ritualOpening(subject: string, gesture: string, setting: string, seed: string): string {
  const heldSubject = clean(subject) || "the Sovereign Standard vessel";
  const heldGesture = clean(gesture) || "the first pour";
  const heldSetting = contextPhrase(setting);
  return sentence(choose([
    `Before ${lowerFirst(heldGesture)}, ${lowerFirst(heldSubject)}${heldSetting} waits`,
    `${heldGesture} begins with ${lowerFirst(heldSubject)}${heldSetting}`,
    `${heldSubject}${heldSetting} holds the pause before ${lowerFirst(heldGesture)}`,
  ], `${seed}:ritual`));
}

function relationOpening(subject: string, details: string, seed: string): string {
  const heldSubject = clean(subject) || "the Sovereign Standard vessel";
  const heldDetails = clean(details);
  if (!heldDetails) return sentence(`${heldSubject} enters the room`);
  return sentence(choose([
    `${heldSubject} keeps company with the objects gathered around it`,
    `${heldSubject} enters a field of nearby objects`,
    `${heldSubject} settles among the familiar forms around it`,
  ], `${seed}:relation`));
}

function middleParagraph(input: InstagramObservation, movement: CaptionMovement): string {
  const details = clean(input.details);
  const gesture = clean(input.gesture);
  const truth = clean(input.productTruth);
  const sentences: string[] = [];
  if (details) sentences.push(sentence(details));
  if (truth) sentences.push(sentence(truth));
  const bridges: Record<CaptionMovement, readonly string[]> = {
    stillness: [
      "What is held in shadow waits for water and the quiet attention of the day",
      "Leaf, vessel, and light remain long enough for ordinary things to become present",
      "The familiar form returns, changed gently by attention and use",
    ],
    ritual: [
      `${gesture || "The measured gesture"} gives the moment a beginning`,
      `Through ${lowerFirst(gesture || "the familiar gesture")}, time becomes briefly visible`,
      `The movement is simple; ${lowerFirst(gesture || "the daily return")} gives it duration`,
    ],
    relation: [
      "The objects keep their separate forms while the room gathers around them",
      "Material, warmth, and attention meet without needing to become more than they are",
      "The relation is quiet: each thing held clearly beside the next",
    ],
  };
  sentences.push(sentence(choose(bridges[movement], `${input.seed}:${movement}:bridge`)));
  return sentences.join(" ");
}

function finalParagraph(input: InstagramObservation, movement: CaptionMovement): string {
  const atmosphere = clean(input.atmosphere) || "ritual as a way of keeping time";
  const movementLead: Record<CaptionMovement, readonly string[]> = {
    stillness: ["Quiet given duration", "Tea as atmosphere", "A pause, held open"],
    ritual: ["A beginning, returned to", "Ritual gives the day a form", "The day gathers around the ritual"],
    relation: ["Peace assembled from familiar things", "Relation made visible", "The room holds what has gathered"],
  };
  const lead = sentence(choose(movementLead[movement], `${input.seed}:${movement}:close`));
  const field = sentence(atmosphere);
  const closing = input.closing === "profile"
    ? "Collection through the link in profile."
    : input.closing === "brand" ? "Sovereign Standard." : "";
  return [lead, field, closing].filter(Boolean).join(" ");
}

export function composeAltText(input: InstagramObservation): string {
  const subject = clean(input.subject) || "Sovereign Standard tea vessel";
  const setting = clean(input.setting);
  const light = clean(input.light);
  const details = clean(input.details);
  const firstSentence = [
    upperFirst(subject),
    setting,
    light ? `photographed in ${lowerFirst(light)}` : "",
  ].filter(Boolean).join(", ").replace(/,+/gu, ",");
  return [sentence(firstSentence), details ? sentence(details) : ""].filter(Boolean).join(" ").slice(0, 500);
}

export function composeInstagramDrafts(input: InstagramObservation): InstagramDraft[] {
  const openings: Record<CaptionMovement, string> = {
    stillness: lightOpening(input.subject, input.light, input.setting, input.seed),
    ritual: ritualOpening(input.subject, input.gesture, input.setting, input.seed),
    relation: relationOpening(input.subject, input.details, input.seed),
  };
  const altText = composeAltText(input);
  return (["stillness", "ritual", "relation"] as CaptionMovement[]).map((movement) => {
    const caption = [openings[movement], middleParagraph(input, movement), finalParagraph(input, movement)].join("\n\n");
    return {
      id: `${movement}-${stableNumber(`${input.seed}:${caption}:${altText}`).toString(16).padStart(8, "0")}`,
      movement,
      caption,
      altText,
    };
  });
}

export function inspectInstagramDraft(caption: string, altText: string): DraftInspection {
  const heldCaption = caption.trim();
  const heldAlt = altText.trim();
  const lower = heldCaption.toLocaleLowerCase();
  const checks = [
    { label: "caption 40–2,200 characters", passed: heldCaption.length >= 40 && heldCaption.length <= 2200 },
    { label: "literal alt text 20–500 characters", passed: heldAlt.length >= 20 && heldAlt.length <= 500 },
    { label: "three-part movement", passed: heldCaption.split(/\n\s*\n/u).length === 3 },
    { label: "no hashtags or embedded links", passed: !/[#]|https?:\/\//u.test(heldCaption) },
    { label: "no pricing or system mechanics", passed: instagramGrammar.forbidden.every((term) => !new RegExp(`\\b${term}\\b`, "u").test(lower)) && !/[$€£]\s*\d/u.test(heldCaption) },
  ];
  return { valid: checks.every(({ passed }) => passed), checks };
}
