import { describe, expect, it } from "vitest";
import { composeInstagramDrafts, inspectInstagramDraft, type InstagramObservation } from "./instagram-grammar";

const observation: InstagramObservation = {
  subject: "Open Sovereign Standard black tea tin beside its engraved lid",
  setting: "on a dark table",
  light: "soft morning light",
  details: "A wooden scoop rests across loose leaves while a white mug waits nearby",
  gesture: "the first pour",
  atmosphere: "Ritual as a way of keeping time",
  productTruth: "The composed green tea waits for water and measured attention",
  closing: "brand",
  seed: "sha256:test",
};

describe("Sovereign Standard Instagram grammar", () => {
  it("composes deterministic captions in three distinct movements", () => {
    const drafts = composeInstagramDrafts(observation);
    expect(drafts).toEqual(composeInstagramDrafts(observation));
    expect(drafts.map(({ movement }) => movement)).toEqual(["stillness", "ritual", "relation"]);
    expect(new Set(drafts.map(({ caption }) => caption)).size).toBe(3);
    drafts.forEach(({ caption, altText }) => expect(inspectInstagramDraft(caption, altText).valid).toBe(true));
  });

  it("keeps alt text literal and grounded in supplied observation", () => {
    const [{ altText }] = composeInstagramDrafts(observation);
    expect(altText).toContain("Open Sovereign Standard black tea tin");
    expect(altText).toContain("soft morning light");
    expect(altText).toContain("A wooden scoop rests across loose leaves");
    expect(altText).not.toContain("with a wooden scoop rests");
    expect(altText).not.toContain("Ritual as a way of keeping time");
  });

  it("rejects promotional mechanics, prices, hashtags, and links", () => {
    const inspection = inspectInstagramDraft("Buy now for $42.\n\nShipping and checkout are easy.\n\n#tea https://example.com", "Black Sovereign Standard tea tin on a table");
    expect(inspection.valid).toBe(false);
  });
});
